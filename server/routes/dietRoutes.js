
const express = require("express");
const pool = require("../database");
const { isISODate } = require("../utils/dateValidation");

const router = express.Router();

const optionalNumber = (value) => {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }

  if (typeof value !== "number" && typeof value !== "string") {
    return NaN;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0
    ? number
    : NaN;
};

const MEAL_TYPES = ["Breakfast", "Lunch", "Snack", "Dinner"];

router.get("/recommendations", async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isISODate(date)) {
    return res.status(400).json({ message: "A valid recommendation date is required." });
  }
  try {
    const result = await pool.query(
      `SELECT recommended_meal_id, recommendation_date, meal_type, food_name,
              fdc_id, quantity, quantity_unit, calories, protein, carbs, fat,
              status, completed_at, food_log_id
       FROM recommended_meals
       WHERE user_id = $1 AND recommendation_date = $2
       ORDER BY CASE meal_type
         WHEN 'Breakfast' THEN 1 WHEN 'Lunch' THEN 2
         WHEN 'Snack' THEN 3 ELSE 4 END`,
      [req.user.id, date]
    );
    return res.json({ date, meals: result.rows });
  } catch (error) {
    console.error("Load recommended meals:", error);
    return res.status(500).json({ message: "Unable to load recommended meals." });
  }
});

router.put("/recommendations", async (req, res) => {
  const { date, meals } = req.body || {};
  if (
    !isISODate(date) ||
    !Array.isArray(meals) ||
    meals.length > 4 ||
    meals.some((meal) =>
      !MEAL_TYPES.includes(meal.meal_type) ||
      typeof meal.food_name !== "string" ||
      !meal.food_name.trim() ||
      meal.food_name.length > 1000
    ) ||
    new Set(meals.map((meal) => meal.meal_type)).size !== meals.length
  ) {
    return res.status(400).json({ message: "Provide up to four valid, unique meal recommendations and a date." });
  }

  try {
    const saved = [];
    for (const meal of meals) {
      const result = await pool.query(
        `INSERT INTO recommended_meals
           (user_id, recommendation_date, meal_type, food_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, recommendation_date, meal_type)
         DO UPDATE SET food_name = EXCLUDED.food_name,
                       status = 'planned',
                       completed_at = NULL,
                       food_log_id = NULL,
                       updated_at = NOW()
         WHERE recommended_meals.status <> 'completed'
         RETURNING recommended_meal_id, recommendation_date, meal_type,
                   food_name, fdc_id, quantity, quantity_unit, calories,
                   protein, carbs, fat, status, completed_at, food_log_id`,
        [req.user.id, date, meal.meal_type, meal.food_name.trim()]
      );
      if (result.rowCount) saved.push(result.rows[0]);
    }
    return res.json({ meals: saved });
  } catch (error) {
    console.error("Save recommended meals:", error);
    return res.status(500).json({ message: "Unable to save meal recommendations." });
  }
});

router.patch("/recommendations/:mealId", async (req, res) => {
  const mealId = Number(req.params.mealId);
  const { status, actual_food: actualFood } = req.body || {};
  if (
    !Number.isInteger(mealId) ||
    mealId < 1 ||
    !["planned", "completed", "skipped"].includes(status)
  ) {
    return res.status(400).json({ message: "Provide a valid meal ID and status." });
  }

  if (actualFood !== undefined) {
    const calories = Number(actualFood.calories);
    const protein = optionalNumber(actualFood.protein);
    const carbs = optionalNumber(actualFood.carbs);
    const fat = optionalNumber(actualFood.fat);
    const quantity = optionalNumber(actualFood.quantity);
    if (
      status !== "completed" ||
      typeof actualFood.food_name !== "string" ||
      !actualFood.food_name.trim() ||
      actualFood.food_name.trim().length > 500 ||
      !MEAL_TYPES.includes(actualFood.meal_type) ||
      !Number.isFinite(calories) ||
      calories < 0 ||
      Number.isNaN(protein) ||
      Number.isNaN(carbs) ||
      Number.isNaN(fat) ||
      Number.isNaN(quantity) ||
      (quantity !== null && quantity <= 0)
    ) {
      return res.status(400).json({ message: "The replacement food must include valid USDA nutrition and portion details." });
    }
    try {
      const result = await pool.query(
        `WITH target AS (
           SELECT recommended_meal_id, user_id, recommendation_date
           FROM recommended_meals
           WHERE recommended_meal_id = $1 AND user_id = $2
         ),
         inserted_food AS (
           INSERT INTO food_logs
             (user_id, food_name, meal_type, quantity, quantity_unit,
              calories, protein, carbs, fat, is_consumed, consumed_at,
              logged_date)
           SELECT user_id, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, NOW(),
                  recommendation_date
           FROM target
           RETURNING food_log_id
         )
         UPDATE recommended_meals recommendation
         SET meal_type = $4,
             food_name = $3,
             fdc_id = $11,
             quantity = $5,
             quantity_unit = $6,
             calories = $7,
             protein = $8,
             carbs = $9,
             fat = $10,
             status = 'completed',
             completed_at = NOW(),
             food_log_id = (SELECT food_log_id FROM inserted_food),
             updated_at = NOW()
         FROM target
         WHERE recommendation.recommended_meal_id = target.recommended_meal_id
         RETURNING recommendation.recommended_meal_id,
                   recommendation.recommendation_date,
                   recommendation.meal_type, recommendation.food_name,
                   recommendation.fdc_id, recommendation.quantity,
                   recommendation.quantity_unit, recommendation.calories,
                   recommendation.protein, recommendation.carbs,
                   recommendation.fat, recommendation.status,
                   recommendation.completed_at, recommendation.food_log_id`,
        [
          mealId,
          req.user.id,
          actualFood.food_name.trim(),
          actualFood.meal_type,
          quantity,
          actualFood.quantity_unit || "g",
          calories,
          protein,
          carbs,
          fat,
          actualFood.fdc_id || null,
        ]
      );
      if (!result.rowCount) {
        return res.status(404).json({ message: "Recommended meal not found." });
      }
      return res.json({ meal: result.rows[0] });
    } catch (error) {
      console.error("Complete meal with USDA food:", error);
      return res.status(500).json({ message: "Unable to complete meal with the selected food." });
    }
  }

  try {
    const result = status === "planned"
      ? await pool.query(
          `WITH updated_food AS (
             UPDATE food_logs
             SET is_consumed = FALSE, consumed_at = NULL
             WHERE food_log_id = (
               SELECT food_log_id FROM recommended_meals
               WHERE recommended_meal_id = $1 AND user_id = $2
             ) AND user_id = $2
           )
           UPDATE recommended_meals
           SET status = 'planned', completed_at = NULL, food_log_id = NULL,
               updated_at = NOW()
           WHERE recommended_meal_id = $1 AND user_id = $2
           RETURNING recommended_meal_id, recommendation_date, meal_type,
                     food_name, status, completed_at, food_log_id`,
          [mealId, req.user.id]
        )
      : await pool.query(
          `UPDATE recommended_meals
           SET status = $3,
               completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE NULL END,
               updated_at = NOW()
           WHERE recommended_meal_id = $1 AND user_id = $2
           RETURNING recommended_meal_id, recommendation_date, meal_type,
                     food_name, status, completed_at, food_log_id`,
          [mealId, req.user.id, status]
        );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Recommended meal not found." });
    }
    return res.json({ meal: result.rows[0] });
  } catch (error) {
    console.error("Update meal check-in:", error);
    return res.status(500).json({ message: "Unable to update meal check-in." });
  }
});

// Save a food log.
router.post("/", async (req, res) => {
  try {
    const {
      food_name,
      meal_type,
      quantity,
      quantity_unit = "g",
      calories,
      protein,
      carbs,
      fat,
      is_consumed = true,
      logged_date,
    } = req.body;

    const numericUserId = req.user.id;
    const numericQuantity = optionalNumber(quantity);
    const numericCalories = Number(calories);
    const numericProtein = optionalNumber(protein);
    const numericCarbs = optionalNumber(carbs);
    const numericFat = optionalNumber(fat);
    const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"];

    if (
      typeof food_name !== "string" ||
      !food_name.trim() ||
      food_name.trim().length > 500 ||
      !mealTypes.includes(meal_type || "Breakfast") ||
      typeof quantity_unit !== "string" ||
      !quantity_unit.trim() ||
      quantity_unit.trim().length > 30 ||
      Number.isNaN(numericQuantity) ||
      (numericQuantity !== null && numericQuantity <= 0) ||
      calories === undefined ||
      calories === ""
    ) {
      return res.status(400).json({
        message: "Valid food name and calories are required.",
      });
    }

    if (
      !Number.isFinite(numericCalories) ||
      numericCalories < 0 ||
      Number.isNaN(numericProtein) ||
      Number.isNaN(numericCarbs) ||
      Number.isNaN(numericFat)
    ) {
      return res.status(400).json({
        message: "Nutrition values must be non-negative numbers.",
      });
    }

    if (typeof is_consumed !== "boolean") {
      return res.status(400).json({
        message: "is_consumed must be true or false.",
      });
    }

    if (logged_date !== undefined && !isISODate(logged_date)) {
      return res.status(400).json({
        message: "A valid log date is required.",
      });
    }

    const result = await pool.query(
      `INSERT INTO food_logs
       (user_id, food_name, meal_type, quantity, quantity_unit,
        calories, protein, carbs, fat, is_consumed, consumed_at, logged_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
               CASE WHEN $10 THEN NOW() ELSE NULL END, COALESCE($11::date, CURRENT_DATE))
       RETURNING *`,
      [
        numericUserId,
        food_name.trim(),
        meal_type || "Breakfast",
        numericQuantity,
        quantity_unit.trim(),
        numericCalories,
        numericProtein,
        numericCarbs,
        numericFat,
        is_consumed,
        logged_date || null,
      ]
    );

    return res.status(201).json({
      message: "Food logged successfully.",
      food: result.rows[0],
    });
  } catch (error) {
    console.error("Create food log:", error);
    return res.status(500).json({
      message: "Unable to save food log.",
    });
  }
});

// Get all food logs for a user.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM food_logs
       WHERE user_id = $1
       ORDER BY created_at DESC NULLS LAST, food_log_id DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Get food logs:", error);
    return res.status(500).json({
      message: "Unable to load food logs.",
    });
  }
});

// Mark a food as eaten or not eaten.
router.patch("/:foodLogId/consumed", async (req, res) => {
  try {
    const foodLogId = Number(req.params.foodLogId);
    const userId = req.user.id;
    const { is_consumed } = req.body;

    if (
      !Number.isInteger(foodLogId) ||
      foodLogId <= 0 ||
      typeof is_consumed !== "boolean"
    ) {
      return res.status(400).json({
        message: "Valid food log ID and consumed status are required.",
      });
    }

    const result = await pool.query(
      `UPDATE food_logs
       SET is_consumed = $1,
           consumed_at = CASE WHEN $1 THEN NOW() ELSE NULL END
       WHERE food_log_id = $2 AND user_id = $3
       RETURNING *`,
      [is_consumed, foodLogId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Food log not found." });
    }

    return res.json({ food: result.rows[0] });
  } catch (error) {
    console.error("Update consumed status:", error);
    return res.status(500).json({
      message: "Unable to update food status.",
    });
  }
});

// Get nutrition totals for one date.
// Defaults to today's date according to the server's local date.
router.get("/summary/daily", async (req, res) => {
  try {
    const userId = req.user.id;
    const date = req.query.date;

    if (date !== undefined && !isISODate(date)) {
      return res.status(400).json({ message: "A valid log date is required." });
    }

    const dateValue = date || new Date().toISOString().slice(0, 10);

    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE is_consumed) AS consumed_food_count,
         COALESCE(SUM(calories) FILTER (WHERE is_consumed), 0) AS calories,
         COALESCE(SUM(protein) FILTER (WHERE is_consumed), 0) AS protein,
         COALESCE(SUM(carbs) FILTER (WHERE is_consumed), 0) AS carbs,
         COALESCE(SUM(fat) FILTER (WHERE is_consumed), 0) AS fat,
         COUNT(*) FILTER (WHERE NOT is_consumed) AS planned_food_count
       FROM food_logs
       WHERE user_id = $1
         AND logged_date = $2::date`,
      [userId, dateValue]
    );

    return res.json({
      date: dateValue,
      ...result.rows[0],
    });
  } catch (error) {
    console.error("Daily nutrition summary:", error);
    return res.status(500).json({
      message: "Unable to calculate daily nutrition.",
    });
  }
});

module.exports = router;
