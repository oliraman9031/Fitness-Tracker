const pool = require("../database");
const { isISODate } = require("../utils/dateValidation");

const createFoodLog = async (req, res) => {
    try {
        if (req.body.food_id !== undefined) {
            const { food_id, meal_type, quantity, quantity_unit, logged_date } = req.body;
            const foodResult = await pool.query(
                `SELECT *
                 FROM foods
                 WHERE id = $1`,
                [Number(food_id)]
            );

            if (foodResult.rowCount === 0) {
                return res.status(404).json({ message: "Saved food was not found" });
            }

            const food = foodResult.rows[0];
            const baseUnit = food.serving_unit || "g";
            const baseQuantity = Number(food.serving_size) || 100;
            if (quantity_unit.trim().toLowerCase() !== baseUnit.toLowerCase()) {
                return res.status(400).json({
                    message: `Quantity unit must match the food serving unit (${baseUnit})`
                });
            }

            const multiplier = Number(quantity) / baseQuantity;
            const scaleNutrient = (value) => (
                value === null || value === undefined ? null : Number(value) * multiplier
            );
            const result = await pool.query(
                `INSERT INTO food_logs
                    (user_id, food_id, food_name, meal_type, quantity, quantity_unit,
                     calories, protein, carbs, fat, fiber, sugar, sodium, logged_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                        COALESCE($14::date, CURRENT_DATE))
                 RETURNING *`,
                [
                    req.user.id,
                    food.id,
                    food.name,
                    meal_type,
                    Number(quantity),
                    baseUnit,
                    scaleNutrient(food.calories),
                    scaleNutrient(food.protein),
                    scaleNutrient(food.carbohydrates),
                    scaleNutrient(food.fat),
                    scaleNutrient(food.fiber),
                    scaleNutrient(food.sugar),
                    scaleNutrient(food.sodium),
                    logged_date || null
                ]
            );

            return res.status(201).json({
                message: "Food added to diet successfully",
                food: result.rows[0]
            });
        }

        const {
            food_name,
            meal_type,
            quantity,
            calories,
            protein,
            carbs,
            fat
        } = req.body;

        const numericProtein = protein === "" || protein === undefined ? null : Number(protein);
        const numericCarbs = carbs === "" || carbs === undefined ? null : Number(carbs);
        const numericFat = fat === "" || fat === undefined ? null : Number(fat);

        const result = await pool.query(
            `INSERT INTO food_logs
                (user_id, food_name, meal_type, quantity, calories, protein, carbs, fat)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                req.user.id,
                food_name,
                meal_type || "Breakfast",
                quantity || null,
                Number(calories),
                numericProtein,
                numericCarbs,
                numericFat
            ]
        );

        res.status(201).json({
            message: "Food logged successfully",
            food: result.rows[0]
        });
    } catch (error) {
        console.error("Failed to create food log:", error);
        res.status(500).json({ message: "Unable to save food log" });
    }
};

const getFoodLogs = async (req, res) => {
    try {
        const logDate = req.query.date;
        if (logDate !== undefined && !isISODate(logDate)) {
            return res.status(400).json({ message: "A valid log date is required" });
        }

        const result = logDate === undefined
            ? await pool.query(
                `SELECT *
                 FROM food_logs
                 WHERE user_id = $1 AND logged_date = CURRENT_DATE
                 ORDER BY created_at DESC NULLS LAST, food_log_id DESC`,
                [req.user.id]
            )
            : await pool.query(
                `SELECT *
                 FROM food_logs
                 WHERE user_id = $1 AND logged_date = $2::date
                 ORDER BY created_at DESC NULLS LAST, food_log_id DESC`,
                [req.user.id, logDate]
            );

        res.json(result.rows);
    } catch (error) {
        console.error("Failed to load food logs:", error);
        res.status(500).json({ message: "Unable to load food logs" });
    }
};

module.exports = { createFoodLog, getFoodLogs };
