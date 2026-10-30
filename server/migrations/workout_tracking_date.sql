ALTER TABLE workout_logs
  ADD COLUMN IF NOT EXISTS workout_date DATE;

UPDATE workout_logs
SET workout_date = (created_at AT TIME ZONE 'UTC')::date
WHERE workout_date IS NULL;

ALTER TABLE workout_logs
  ALTER COLUMN workout_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN workout_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date
  ON workout_logs (user_id, workout_date);
