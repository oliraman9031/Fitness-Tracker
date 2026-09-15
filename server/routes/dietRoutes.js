const express = require("express");
const pool = require("../database");

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const {
            user_id,
            food_name,
            meal_type,
            quantity,
            calories,
            protein,
            carbs,
            fat
        } = req.body;

        if (!user_id || !food_name || calories === undefined || calories === "") {
            return res.status(400).json({
                message: "User ID, food name, and calories are required"
            });
        }

        const numericCalories = Number(calories);
        const numericProtein = protein === "" || protein === undefined ? null : Number(protein);
        const numericCarbs = carbs === "" || carbs === undefined ? null : Number(carbs);
        const numericFat = fat === "" || fat === undefined ? null : Number(fat);

        if (
            !Number.isFinite(numericCalories) ||
            (numericProtein !== null && !Number.isFinite(numericProtein)) ||
            (numericCarbs !== null && !Number.isFinite(numericCarbs)) ||
            (numericFat !== null && !Number.isFinite(numericFat))
        ) {
            return res.status(400).json({ message: "Nutrition values must be numbers" });
        }

        const result = await pool.query(
            `INSERT INTO food_logs
                (user_id, food_name, meal_type, quantity, calories, protein, carbs, fat)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                user_id,
                food_name,
                meal_type || "Breakfast",
                quantity || null,
                numericCalories,
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
});

router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            `SELECT *
             FROM food_logs
             WHERE user_id = $1
             ORDER BY created_at DESC NULLS LAST, food_log_id DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Failed to load food logs:", error);
        res.status(500).json({ message: "Unable to load food logs" });
    }
});

module.exports = router;
