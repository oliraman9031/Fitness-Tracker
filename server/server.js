const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./database");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

const progressRoutes = require("./routes/progressRoutes");
const dietRoutes = require("./routes/dietRoutes");
const pageRoutes = require("./routes/pageRoutes");
const errorHandler = require("./middleware/errorHandler");
const foodRoutes = require("./routes/foodRoutes");

const workoutRoutes = require("./routes/workoutRoutes");
const coachRoutes = require("./routes/coachRoutes");


app.use("/api/workouts", workoutRoutes);
app.use("/api/coach", coachRoutes);



app.use("/api/progress", progressRoutes);
app.use("/api/diet", dietRoutes);
app.use("/", pageRoutes);

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check database failure:", error);
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});


app.use("/api/food", foodRoutes);
app.use(errorHandler);

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
      CREATE TABLE IF NOT EXISTS foods (
        id SERIAL PRIMARY KEY,
        fdc_id BIGINT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        brand TEXT,
        serving_size NUMERIC,
        serving_unit TEXT,
        calories NUMERIC,
        protein NUMERIC,
        carbohydrates NUMERIC,
        fat NUMERIC,
        fiber NUMERIC,
        sugar NUMERIC,
        sodium NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS food_search_cache (
        search_query TEXT PRIMARY KEY,
        response JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);

    await pool.query(`
      ALTER TABLE food_logs
        ADD COLUMN IF NOT EXISTS food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS quantity_unit TEXT NOT NULL DEFAULT 'g',
        ADD COLUMN IF NOT EXISTS fiber NUMERIC,
        ADD COLUMN IF NOT EXISTS sugar NUMERIC,
        ADD COLUMN IF NOT EXISTS sodium NUMERIC,
        ADD COLUMN IF NOT EXISTS is_consumed BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ DEFAULT NOW()
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workout_logs (
        workout_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        exercise_name VARCHAR(150) NOT NULL,
        duration_minutes INTEGER NOT NULL
          CHECK (duration_minutes BETWEEN 1 AND 1440),
        calories_burned NUMERIC(8, 2)
          CHECK (calories_burned IS NULL OR calories_burned >= 0),
        completed BOOLEAN NOT NULL DEFAULT TRUE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS meal_plans (
        plan_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        plan_date DATE NOT NULL,
        plan_data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, plan_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_food_logs_user_created
        ON food_logs (user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_workout_logs_user_created
        ON workout_logs (user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date
        ON meal_plans (user_id, plan_date)
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