CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL
);

DO $sequence$
DECLARE
  sequence_name TEXT;
  maximum_user_id BIGINT;
BEGIN
  sequence_name := pg_get_serial_sequence('users', 'user_id');
  IF sequence_name IS NOT NULL THEN
    SELECT MAX(user_id) INTO maximum_user_id FROM users;
    PERFORM setval(
      sequence_name::regclass,
      COALESCE(maximum_user_id, 1),
      maximum_user_id IS NOT NULL
    );
  END IF;
END;
$sequence$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
  ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
  ON auth_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
  ON auth_sessions (expires_at);

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'progress_records_user_id_fkey'
      AND conrelid = 'progress_records'::regclass
  ) THEN
    ALTER TABLE progress_records
      ADD CONSTRAINT progress_records_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(user_id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'food_logs_user_id_fkey'
      AND conrelid = 'food_logs'::regclass
  ) THEN
    ALTER TABLE food_logs
      ADD CONSTRAINT food_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(user_id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workout_logs_user_id_fkey'
      AND conrelid = 'workout_logs'::regclass
  ) THEN
    ALTER TABLE workout_logs
      ADD CONSTRAINT workout_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(user_id) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'meal_plans_user_id_fkey'
      AND conrelid = 'meal_plans'::regclass
  ) THEN
    ALTER TABLE meal_plans
      ADD CONSTRAINT meal_plans_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(user_id) NOT VALID;
  END IF;
END;
$migration$;
