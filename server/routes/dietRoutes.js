
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

    const result = await pool.query(
      `INSERT INTO food_logs
       (user_id, food_name, meal_type, quantity, quantity_unit,
        calories, protein, carbs, fat, is_consumed, consumed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
               CASE WHEN $10 THEN NOW() ELSE NULL END)
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
         AND created_at >= $2::date
         AND created_at < ($2::date + INTERVAL '1 day')`,
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
