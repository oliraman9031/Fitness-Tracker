ALTER TABLE users
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5, 2)
    CHECK (height_cm IS NULL OR height_cm BETWEEN 80 AND 250),
  ADD COLUMN IF NOT EXISTS hydration_goal_ml INTEGER NOT NULL DEFAULT 2000
    CHECK (hydration_goal_ml BETWEEN 250 AND 10000),
  ADD COLUMN IF NOT EXISTS steps_goal INTEGER NOT NULL DEFAULT 8000
    CHECK (steps_goal BETWEEN 500 AND 100000),
  ADD COLUMN IF NOT EXISTS profile_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE workout_logs
  ADD COLUMN IF NOT EXISTS workout_date DATE;
UPDATE workout_logs
SET workout_date = (created_at AT TIME ZONE 'UTC')::date
WHERE workout_date IS NULL;
ALTER TABLE workout_logs
  ALTER COLUMN workout_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN workout_date SET NOT NULL;

CREATE TABLE IF NOT EXISTS recommended_meals (
  recommended_meal_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  recommendation_date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL
    CHECK (meal_type IN ('Breakfast', 'Lunch', 'Snack', 'Dinner')),
  food_name TEXT NOT NULL,
  fdc_id BIGINT,
  quantity NUMERIC CHECK (quantity IS NULL OR quantity > 0),
  quantity_unit TEXT NOT NULL DEFAULT 'g',
  calories NUMERIC NOT NULL DEFAULT 0 CHECK (calories >= 0),
  protein NUMERIC NOT NULL DEFAULT 0 CHECK (protein >= 0),
  carbs NUMERIC NOT NULL DEFAULT 0 CHECK (carbs >= 0),
  fat NUMERIC NOT NULL DEFAULT 0 CHECK (fat >= 0),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  food_log_id INTEGER REFERENCES food_logs(food_log_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_water_entries (
  water_entry_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  amount_ml INTEGER NOT NULL CHECK (amount_ml BETWEEN 1 AND 20000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_activity_entries (
  activity_entry_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type VARCHAR(80) NOT NULL,
  steps INTEGER CHECK (steps IS NULL OR steps BETWEEN 0 AND 100000),
  distance_m NUMERIC(9, 2) CHECK (distance_m IS NULL OR distance_m BETWEEN 0 AND 1000000),
  active_minutes INTEGER NOT NULL CHECK (active_minutes BETWEEN 0 AND 1440),
  data_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (data_source IN ('manual', 'connected_device')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sleep_logs (
  sleep_log_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  sleep_date DATE NOT NULL,
  sleep_start TIMESTAMPTZ NOT NULL,
  wake_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 1440),
  sleep_quality SMALLINT CHECK (sleep_quality BETWEEN 1 AND 5),
  fatigue_rating SMALLINT CHECK (fatigue_rating BETWEEN 1 AND 5),
  soreness_rating SMALLINT CHECK (soreness_rating BETWEEN 1 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, sleep_date),
  CHECK (wake_time > sleep_start)
);

CREATE TABLE IF NOT EXISTS scheduled_habits (
  scheduled_habit_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  habit_key TEXT NOT NULL,
  weekdays SMALLINT[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  target_value NUMERIC,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, habit_key),
  CHECK (habit_key IN (
    'meal:Breakfast', 'meal:Lunch', 'meal:Snack', 'meal:Dinner',
    'water', 'steps', 'sleep', 'workout'
  ))
);

CREATE TABLE IF NOT EXISTS recovery_records (
  recovery_record_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  recovery_date DATE NOT NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  factors JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, recovery_date)
);

CREATE INDEX IF NOT EXISTS idx_recommended_meals_user_date
  ON recommended_meals (user_id, recommendation_date);
CREATE INDEX IF NOT EXISTS idx_water_entries_user_date
  ON daily_water_entries (user_id, entry_date, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_entries_user_date
  ON daily_activity_entries (user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date
  ON sleep_logs (user_id, sleep_date);
CREATE INDEX IF NOT EXISTS idx_recovery_records_user_date
  ON recovery_records (user_id, recovery_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recommended_meals_user_date_type
  ON recommended_meals (user_id, recommendation_date, meal_type);

INSERT INTO daily_water_entries (user_id, entry_date, amount_ml)
SELECT user_id, activity_date, ROUND(water_liters * 1000)::integer
FROM daily_wellness_logs
WHERE water_liters > 0
  AND NOT EXISTS (
    SELECT 1 FROM daily_water_entries water
    WHERE water.user_id = daily_wellness_logs.user_id
      AND water.entry_date = daily_wellness_logs.activity_date
  );

INSERT INTO daily_activity_entries
  (user_id, activity_date, activity_type, steps, active_minutes, data_source)
SELECT user_id, activity_date, 'General activity', steps, 0, 'manual'
FROM daily_wellness_logs
WHERE steps > 0
  AND NOT EXISTS (
    SELECT 1 FROM daily_activity_entries activity
    WHERE activity.user_id = daily_wellness_logs.user_id
      AND activity.activity_date = daily_wellness_logs.activity_date
      AND activity.steps IS NOT NULL
  );
