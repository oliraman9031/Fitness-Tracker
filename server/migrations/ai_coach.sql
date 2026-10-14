
-- 1. Add eaten/not-eaten tracking to existing food logs.
ALTER TABLE food_logs
ADD COLUMN IF NOT EXISTS is_consumed BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE food_logs
ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Store completed workouts.
CREATE TABLE IF NOT EXISTS workout_logs (
    workout_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    exercise_name VARCHAR(150) NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 1440),
    calories_burned NUMERIC(8, 2)
        CHECK (calories_burned IS NULL OR calories_burned >= 0),
    completed BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Store the user's saved AI meal plans.
CREATE TABLE IF NOT EXISTS meal_plans (
    plan_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    plan_date DATE NOT NULL,
    plan_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, plan_date)
);

-- 4. Useful indexes.
CREATE INDEX IF NOT EXISTS idx_food_logs_user_created
ON food_logs (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_created
ON workout_logs (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date
ON meal_plans (user_id, plan_date);
