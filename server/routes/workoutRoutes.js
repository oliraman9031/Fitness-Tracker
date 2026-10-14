
const express = require("express");
const pool = require("../database");

const router = express.Router();

// Save a completed workout.
router.post("/", async (req, res) => {
  try {
    const {
      user_id,
      exercise_name,
      duration_minutes,
      calories_burned,
      notes,
      completed = true,
    } = req.body;

    const userId = Number(user_id);
    const duration = Number(duration_minutes);

    const calories =
      calories_burned === "" ||
      calories_burned === undefined ||
      calories_burned === null
        ? null
        : Number(calories_burned);

    if (typeof completed !== "boolean") {
      return res.status(400).json({
        message: "completed must be true or false.",
      });
    }

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !exercise_name?.trim()
    ) {
      return res.status(400).json({
        message: "Valid user ID and exercise name are required.",
      });
    }

    if (
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 1440
    ) {
      return res.status(400).json({
        message: "Duration must be between 1 and 1440 minutes.",
      });
    }

    if (calories === null) {
      return res.status(400).json({
        message: "Enter calories burned; use 0 if no calories were burned.",
      });
    }

    if (!Number.isFinite(calories) || calories < 0 || calories > 999999.99) {
      return res.status(400).json({
        message: "Calories burned must be between 0 and 999999.99.",
      });
    }

    const result = await pool.query(
      `INSERT INTO workout_logs
       (user_id, exercise_name, duration_minutes,
        calories_burned, notes, completed)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        exercise_name.trim(),
        duration,
        calories,
        notes || null,
        completed,
      ]
    );

    return res.status(201).json({
      message: "Workout recorded successfully.",
      workout: result.rows[0],
    });
  } catch (error) {
    console.error("Create workout:", error);
    return res.status(500).json({
      message: "Unable to save workout.",
    });
  }
});

// List a user's workout history.
router.get("/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const result = await pool.query(
      `SELECT *
       FROM workout_logs
       WHERE user_id = $1
       ORDER BY created_at DESC, workout_id DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Get workouts:", error);
    return res.status(500).json({
      message: "Unable to load workouts.",
    });
  }
});

module.exports = router;
