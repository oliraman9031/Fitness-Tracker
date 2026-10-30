CREATE UNIQUE INDEX IF NOT EXISTS idx_recommended_meals_user_date_type
  ON recommended_meals (user_id, recommendation_date, meal_type);
