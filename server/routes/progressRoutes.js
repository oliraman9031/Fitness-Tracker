const express = require("express");
const pool = require("../database");

const router = express.Router();

// Add today's weight
router.post("/", async (req, res) => {
    try {
        const { user_id, weight } = req.body;

        const numericWeight = Number(weight);

        if (!user_id || weight === undefined || weight === "") {
            return res.status(400).json({
                message: "User ID and weight are required"
            });
        }

        if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
            return res.status(400).json({
                message: "Weight must be a positive number"
            });
        }

        const result = await pool.query(
            `INSERT INTO progress_records (user_id, weight)
             VALUES ($1, $2)
             RETURNING *`,
            [user_id, numericWeight]
        );

        res.status(201).json({
            message: "Weight recorded successfully",
            progress: result.rows[0]
        });

    } catch (error) {
        console.error("Failed to create progress record:", error);

        res.status(500).json({
            message: "Unable to save progress record"
        });
    }
});


// Get user's progress
router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `SELECT progress_id, weight, recorded_date
             FROM progress_records
             WHERE user_id = $1
             ORDER BY recorded_date ASC`,
            [userId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Failed to load progress records:", error);

        res.status(500).json({
            message: "Unable to load progress records"
        });
    }
});

module.exports = router;