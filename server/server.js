const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "STHIRA API is running"
    });
});

const progressRoutes = require("./routes/progressRoutes");
const dietRoutes = require("./routes/dietRoutes");

app.use("/api/progress", progressRoutes);
app.use("/api/diet", dietRoutes);

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check database failure:", error);
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

const pool = require("./database");

const PORT = 5000;

async function startServer() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS progress_records (
        progress_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        weight NUMERIC(6, 2) NOT NULL CHECK (weight > 0),
        recorded_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      INSERT INTO users (user_id, name, email, password_hash)
      VALUES (1, 'Prototype User', 'prototype@sthira.local', 'prototype-only')
      ON CONFLICT (user_id) DO NOTHING
    `);

    const result = await pool.query("SELECT NOW()");
    console.log("Database connected:", result.rows);

    app.listen(PORT, () => {
      console.log(`STHIRA server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exitCode = 1;
  }
}

startServer();