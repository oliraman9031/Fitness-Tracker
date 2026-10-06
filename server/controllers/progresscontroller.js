const pool = require("../database");

const addProgress = async (req, res) => {
    try {
        const { user_id, weight } = req.body;
        const result = await pool.query(
            `INSERT INTO progress_records (user_id, weight)
             VALUES ($1, $2)
             RETURNING *`,
            [user_id, Number(weight)]
        );

        res.status(201).json({
            message: "Weight recorded successfully",
            progress: result.rows[0]
        });
    } catch (error) {
        console.error("Failed to create progress record:", error);
        res.status(500).json({ message: "Unable to save progress record" });
    }
};

const getProgress = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT progress_id, weight, recorded_date
             FROM progress_records
             WHERE user_id = $1
             ORDER BY recorded_date ASC`,
            [req.params.userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Failed to load progress records:", error);
        res.status(500).json({ message: "Unable to load progress records" });
    }
};

module.exports = { addProgress, getProgress };
