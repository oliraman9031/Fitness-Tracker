const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const pool = require("./database");
const { requireAuth } = require("./middleware/authenticate");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

const progressRoutes = require("./routes/progressRoutes");
const dietRoutes = require("./routes/dietRoutes");
const pageRoutes = require("./routes/pageRoutes");
const errorHandler = require("./middleware/errorHandler");
const foodRoutes = require("./routes/foodRoutes");
const authRoutes = require("./routes/authRoutes");

const workoutRoutes = require("./routes/workoutRoutes");
const coachRoutes = require("./routes/coachRoutes");

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check database failure:", error);
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

app.use("/api", (req, res, next) => {
  const origin = req.get("origin");
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(req.method);

  if (isMutation && origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ message: "Request origin is not allowed." });
  }
  return next();
});
app.use("/api/auth", authRoutes);
app.use("/api", requireAuth(pool));
app.use("/api/workouts", workoutRoutes);
app.use("/api/coach", coachRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/diet", dietRoutes);
app.use("/api/food", foodRoutes);
app.use("/", pageRoutes);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(254) NOT NULL,
        password_hash TEXT NOT NULL
      )
    `);

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
      CREATE TABLE IF NOT EXISTS food_logs (
        food_log_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        food_name TEXT NOT NULL,
        meal_type TEXT NOT NULL DEFAULT 'Breakfast',
        quantity NUMERIC,
        calories NUMERIC NOT NULL,
        protein NUMERIC,
        carbs NUMERIC,
        fat NUMERIC,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        logged_date DATE NOT NULL DEFAULT CURRENT_DATE
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

    const authenticationMigration = fs.readFileSync(
      path.join(__dirname, "migrations", "authentication.sql"),
      "utf8"
    );
    const migrationClient = await pool.connect();
    try {
      await migrationClient.query("BEGIN");
      await migrationClient.query("SELECT pg_advisory_xact_lock(74520318)");
      await migrationClient.query(`
        CREATE TABLE IF NOT EXISTS app_migrations (
          name TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const appliedMigration = await migrationClient.query(
        "SELECT 1 FROM app_migrations WHERE name = $1",
        ["authentication"]
      );
      if (!appliedMigration.rowCount) {
        await migrationClient.query(authenticationMigration);
        await migrationClient.query(
          "INSERT INTO app_migrations (name) VALUES ($1)",
          ["authentication"]
        );
      }
      await migrationClient.query("COMMIT");
    } catch (error) {
      await migrationClient.query("ROLLBACK");
      throw error;
    } finally {
      migrationClient.release();
    }

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

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };