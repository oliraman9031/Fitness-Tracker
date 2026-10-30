const express = require("express");
const pool = require("../database");
const {
  getTodayAtOffset,
  isISODate,
  toISODate,
} = require("../utils/dateValidation");
const {
  calculateConsistency,
  calculateRecovery,
} = require("../services/progressAnalysisService");

const router = express.Router();

function isValidCheckIn({ steps, water_liters, sleep_hours, recovery_rating }) {
  return (
    Number.isInteger(steps) &&
    steps >= 0 &&
    steps <= 100000 &&
    Number.isFinite(water_liters) &&
    water_liters >= 0 &&
    water_liters <= 20 &&
    Number.isInteger(water_liters * 10) &&
    Number.isFinite(sleep_hours) &&
    sleep_hours >= 0 &&
    sleep_hours <= 24 &&
    Number.isInteger(sleep_hours * 10) &&
    Number.isInteger(recovery_rating) &&
    recovery_rating >= 1 &&
    recovery_rating <= 5
  );
}

function isNumericInput(value) {
  return (
    (typeof value === "number" ||
      (typeof value === "string" && value.trim() !== "")) &&
    Number.isFinite(Number(value))
  );
}

router.get("/daily", async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isISODate(date)) {
    return res.status(400).json({ message: "A valid date (YYYY-MM-DD) is required." });
  }

  try {
    const result = await pool.query(
      `SELECT activity_date, steps, water_liters, sleep_hours, recovery_rating
       FROM daily_wellness_logs
       WHERE user_id = $1 AND activity_date = $2`,
      [req.user.id, date]
    );
    return res.json({ date, log: result.rows[0] || null });
  } catch (error) {
    console.error("Load daily wellness check-in:", error);
    return res.status(500).json({ message: "Unable to load daily check-in." });
  }
});

router.put("/daily", async (req, res) => {
  const {
    activity_date: date,
    steps,
    water_liters,
    sleep_hours,
    recovery_rating,
  } = req.body || {};
  const values = [steps, water_liters, sleep_hours, recovery_rating];
  const checkIn = {
    steps: Number(steps),
    water_liters: Number(water_liters),
    sleep_hours: Number(sleep_hours),
    recovery_rating: Number(recovery_rating),
  };

  if (
    !isISODate(date) ||
    !values.every(isNumericInput) ||
    !isValidCheckIn(checkIn)
  ) {
    return res.status(400).json({
      message: "Enter a valid date, steps (0–100000), water (0–20 L), sleep (0–24 hours), and recovery rating (1–5).",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO daily_wellness_logs
         (user_id, activity_date, steps, water_liters, sleep_hours, recovery_rating)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, activity_date)
       DO UPDATE SET steps = EXCLUDED.steps,
                     water_liters = EXCLUDED.water_liters,
                     sleep_hours = EXCLUDED.sleep_hours,
                     recovery_rating = EXCLUDED.recovery_rating,
                     updated_at = NOW()
       RETURNING activity_date, steps, water_liters, sleep_hours, recovery_rating`,
      [
        req.user.id,
        date,
        checkIn.steps,
        checkIn.water_liters,
        checkIn.sleep_hours,
        checkIn.recovery_rating,
      ]
    );
    return res.json({ log: result.rows[0] });
  } catch (error) {
    console.error("Save daily wellness check-in:", error);
    return res.status(500).json({ message: "Unable to save daily check-in." });
  }
});

router.get("/profile", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT height_cm, hydration_goal_ml, steps_goal, profile_preferences
       FROM users WHERE user_id = $1`,
      [req.user.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Profile not found." });
    }
    return res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error("Load wellness profile:", error);
    return res.status(500).json({ message: "Unable to load wellness profile." });
  }
});

router.patch("/profile", async (req, res) => {
  const { height_cm, hydration_goal_ml, steps_goal, profile_preferences } =
    req.body || {};
  const values = [height_cm, hydration_goal_ml, steps_goal];
  if (
    (height_cm !== null &&
      height_cm !== undefined &&
      (!isNumericInput(height_cm) || Number(height_cm) < 80 || Number(height_cm) > 250)) ||
    (hydration_goal_ml !== undefined &&
      (!isNumericInput(hydration_goal_ml) ||
        !Number.isInteger(Number(hydration_goal_ml)) ||
        Number(hydration_goal_ml) < 250 ||
        Number(hydration_goal_ml) > 10000)) ||
    (steps_goal !== undefined &&
      (!isNumericInput(steps_goal) ||
        !Number.isInteger(Number(steps_goal)) ||
        Number(steps_goal) < 500 ||
        Number(steps_goal) > 100000)) ||
    (profile_preferences !== undefined &&
      (!profile_preferences ||
        typeof profile_preferences !== "object" ||
        Array.isArray(profile_preferences)))
  ) {
    return res.status(400).json({
      message: "Enter a height between 80–250 cm, water goal between 250–10000 ml, step goal between 500–100000, and valid preferences.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET height_cm = COALESCE($2, height_cm),
           hydration_goal_ml = COALESCE($3, hydration_goal_ml),
           steps_goal = COALESCE($4, steps_goal),
           profile_preferences = COALESCE($5::jsonb, profile_preferences)
       WHERE user_id = $1
       RETURNING height_cm, hydration_goal_ml, steps_goal, profile_preferences`,
      [
        req.user.id,
        height_cm === undefined ? null : height_cm,
        hydration_goal_ml === undefined ? null : hydration_goal_ml,
        steps_goal === undefined ? null : steps_goal,
        profile_preferences === undefined
          ? null
          : JSON.stringify(profile_preferences),
      ]
    );
    return res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error("Update wellness profile:", error);
    return res.status(500).json({ message: "Unable to update wellness profile." });
  }
});

router.get("/water", async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isISODate(date)) {
    return res.status(400).json({ message: "A valid date is required." });
  }
  try {
    const [entries, profile] = await Promise.all([
      pool.query(
        `SELECT water_entry_id, amount_ml, created_at
         FROM daily_water_entries
         WHERE user_id = $1 AND entry_date = $2
         ORDER BY created_at, water_entry_id`,
        [req.user.id, date]
      ),
      pool.query(
        `SELECT hydration_goal_ml FROM users WHERE user_id = $1`,
        [req.user.id]
      ),
    ]);
    const totalMl = entries.rows.reduce(
      (total, entry) => total + Number(entry.amount_ml),
      0
    );
    return res.json({
      date,
      entries: entries.rows,
      total_ml: totalMl,
      goal_ml: profile.rows[0]?.hydration_goal_ml || 2000,
    });
  } catch (error) {
    console.error("Load water entries:", error);
    return res.status(500).json({ message: "Unable to load water entries." });
  }
});

router.post("/water", async (req, res) => {
  const { entry_date: date, amount_ml: amountMl } = req.body || {};
  if (
    !isISODate(date) ||
    !isNumericInput(amountMl) ||
    !Number.isInteger(Number(amountMl)) ||
    Number(amountMl) < 1 ||
    Number(amountMl) > 20000
  ) {
    return res.status(400).json({ message: "Enter a valid date and water amount (1–20000 ml)." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO daily_water_entries (user_id, entry_date, amount_ml)
       VALUES ($1, $2, $3)
       RETURNING water_entry_id, amount_ml, created_at`,
      [req.user.id, date, Number(amountMl)]
    );
    return res.status(201).json({ entry: result.rows[0] });
  } catch (error) {
    console.error("Add water entry:", error);
    return res.status(500).json({ message: "Unable to add water entry." });
  }
});

router.delete("/water/:entryId", async (req, res) => {
  const entryId = Number(req.params.entryId);
  if (!Number.isInteger(entryId) || entryId < 1) {
    return res.status(400).json({ message: "A valid water entry ID is required." });
  }
  try {
    const result = await pool.query(
      `DELETE FROM daily_water_entries
       WHERE water_entry_id = $1 AND user_id = $2
       RETURNING water_entry_id`,
      [entryId, req.user.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Water entry not found." });
    }
    return res.json({ deleted: true });
  } catch (error) {
    console.error("Remove water entry:", error);
    return res.status(500).json({ message: "Unable to remove water entry." });
  }
});

router.get("/activities", async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isISODate(date)) {
    return res.status(400).json({ message: "A valid date is required." });
  }
  try {
    const result = await pool.query(
      `SELECT activity_entry_id, activity_date, activity_type, steps,
              distance_m, active_minutes, data_source, created_at
       FROM daily_activity_entries
       WHERE user_id = $1 AND activity_date = $2
       ORDER BY created_at, activity_entry_id`,
      [req.user.id, date]
    );
    return res.json({ date, entries: result.rows });
  } catch (error) {
    console.error("Load activity entries:", error);
    return res.status(500).json({ message: "Unable to load activity entries." });
  }
});

router.post("/activities", async (req, res) => {
  const {
    activity_date: date,
    activity_type: activityType,
    steps,
    distance_m: distanceM,
    active_minutes: activeMinutes,
    data_source: dataSource = "manual",
  } = req.body || {};
  const optionalSteps = steps === null || steps === undefined ? null : Number(steps);
  const optionalDistance =
    distanceM === null || distanceM === undefined ? null : Number(distanceM);
  if (
    !isISODate(date) ||
    typeof activityType !== "string" ||
    !activityType.trim() ||
    activityType.length > 80 ||
    (optionalSteps !== null &&
      (!Number.isInteger(optionalSteps) || optionalSteps < 0 || optionalSteps > 100000)) ||
    (optionalDistance !== null &&
      (!Number.isFinite(optionalDistance) || optionalDistance < 0 || optionalDistance > 1000000)) ||
    !Number.isInteger(Number(activeMinutes)) ||
    Number(activeMinutes) < 0 ||
    Number(activeMinutes) > 1440 ||
    !["manual", "connected_device"].includes(dataSource)
  ) {
    return res.status(400).json({ message: "Enter valid activity details and a supported data source." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO daily_activity_entries
         (user_id, activity_date, activity_type, steps, distance_m,
          active_minutes, data_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING activity_entry_id, activity_date, activity_type, steps,
                 distance_m, active_minutes, data_source, created_at`,
      [
        req.user.id,
        date,
        activityType.trim(),
        optionalSteps,
        optionalDistance,
        Number(activeMinutes),
        dataSource,
      ]
    );
    return res.status(201).json({ entry: result.rows[0] });
  } catch (error) {
    console.error("Add activity entry:", error);
    return res.status(500).json({ message: "Unable to add activity entry." });
  }
});

router.delete("/activities/:entryId", async (req, res) => {
  const entryId = Number(req.params.entryId);
  if (!Number.isInteger(entryId) || entryId < 1) {
    return res.status(400).json({ message: "A valid activity entry ID is required." });
  }
  try {
    const result = await pool.query(
      `DELETE FROM daily_activity_entries
       WHERE activity_entry_id = $1 AND user_id = $2
       RETURNING activity_entry_id`,
      [entryId, req.user.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Activity entry not found." });
    }
    return res.json({ deleted: true });
  } catch (error) {
    console.error("Remove activity entry:", error);
    return res.status(500).json({ message: "Unable to remove activity entry." });
  }
});

router.get("/sleep", async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isISODate(date)) {
    return res.status(400).json({ message: "A valid date is required." });
  }
  try {
    const result = await pool.query(
      `SELECT sleep_log_id, sleep_date, sleep_start, wake_time,
              duration_minutes, sleep_quality, fatigue_rating, soreness_rating
       FROM sleep_logs WHERE user_id = $1 AND sleep_date = $2`,
      [req.user.id, date]
    );
    return res.json({ date, sleep: result.rows[0] || null });
  } catch (error) {
    console.error("Load sleep log:", error);
    return res.status(500).json({ message: "Unable to load sleep log." });
  }
});

router.put("/sleep", async (req, res) => {
  const {
    sleep_date: date,
    sleep_start: startValue,
    wake_time: wakeValue,
    duration_hours: durationHours,
    sleep_quality: quality,
    fatigue_rating: fatigue,
    soreness_rating: soreness,
  } = req.body || {};
  const hasSleepTimes = startValue !== undefined || wakeValue !== undefined;
  const start = startValue ? new Date(startValue) : null;
  const wake = wakeValue ? new Date(wakeValue) : null;
  const durationMinutes = hasSleepTimes
    ? start && wake
      ? Math.round((wake.getTime() - start.getTime()) / 60000)
      : NaN
    : Number(durationHours) * 60;
  const ratings = [quality, fatigue, soreness];
  if (
    !isISODate(date) ||
    (hasSleepTimes &&
      (!Number.isFinite(start?.getTime()) || !Number.isFinite(wake?.getTime()))) ||
    durationMinutes < 1 ||
    durationMinutes > 1440 ||
    !Number.isFinite(durationMinutes) ||
    ratings.some((rating) =>
      rating !== null &&
      rating !== undefined &&
      (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5)
    )
  ) {
    return res.status(400).json({ message: "Enter sleep duration from 0.1 to 24 hours, or valid sleep times, and optional ratings from 1 to 5." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO sleep_logs
         (user_id, sleep_date, sleep_start, wake_time, duration_minutes,
          sleep_quality, fatigue_rating, soreness_rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, sleep_date)
       DO UPDATE SET sleep_start = EXCLUDED.sleep_start,
                     wake_time = EXCLUDED.wake_time,
                     duration_minutes = EXCLUDED.duration_minutes,
                     sleep_quality = EXCLUDED.sleep_quality,
                     fatigue_rating = EXCLUDED.fatigue_rating,
                     soreness_rating = EXCLUDED.soreness_rating,
                     updated_at = NOW()
       RETURNING sleep_log_id, sleep_date, sleep_start, wake_time,
                 duration_minutes, sleep_quality, fatigue_rating, soreness_rating`,
      [
        req.user.id,
        date,
        start?.toISOString() ?? null,
        wake?.toISOString() ?? null,
        durationMinutes,
        quality ?? null,
        fatigue ?? null,
        soreness ?? null,
      ]
    );
    return res.json({ sleep: result.rows[0] });
  } catch (error) {
    console.error("Save sleep log:", error);
    return res.status(500).json({ message: "Unable to save sleep log." });
  }
});

router.get("/schedule", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT habit_key, weekdays, target_value, enabled
       FROM scheduled_habits WHERE user_id = $1 ORDER BY habit_key`,
      [req.user.id]
    );
    return res.json({ schedules: result.rows });
  } catch (error) {
    console.error("Load habit schedule:", error);
    return res.status(500).json({ message: "Unable to load habit schedule." });
  }
});

router.put("/schedule", async (req, res) => {
  const schedules = req.body?.schedules;
  const allowedHabits = new Set([
    "meal:Breakfast", "meal:Lunch", "meal:Snack", "meal:Dinner",
    "water", "steps", "sleep", "workout",
  ]);
  if (
    !Array.isArray(schedules) ||
    schedules.length > allowedHabits.size ||
    schedules.some((schedule) =>
      !allowedHabits.has(schedule.habit_key) ||
      typeof schedule.enabled !== "boolean" ||
      !Array.isArray(schedule.weekdays) ||
      schedule.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(schedule.weekdays).size !== schedule.weekdays.length ||
      (schedule.target_value !== null &&
        schedule.target_value !== undefined &&
        (!isNumericInput(schedule.target_value) || Number(schedule.target_value) <= 0))
    ) ||
    new Set(schedules.map((schedule) => schedule.habit_key)).size !== schedules.length
  ) {
    return res.status(400).json({ message: "Provide valid, unique scheduled habits with weekdays from 0 to 6." });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const schedule of schedules) {
      await client.query(
        `INSERT INTO scheduled_habits
           (user_id, habit_key, weekdays, target_value, enabled)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, habit_key)
         DO UPDATE SET weekdays = EXCLUDED.weekdays,
                       target_value = EXCLUDED.target_value,
                       enabled = EXCLUDED.enabled,
                       updated_at = NOW()`,
        [
          req.user.id,
          schedule.habit_key,
          schedule.weekdays,
          schedule.target_value ?? null,
          schedule.enabled,
        ]
      );
    }
    await client.query("COMMIT");
    return res.json({ message: "Habit schedule saved." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Save habit schedule:", error);
    return res.status(500).json({ message: "Unable to save habit schedule." });
  } finally {
    client.release();
  }
});

router.get("/consistency", async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const days = Number(req.query.days || 7);
  const timezoneOffset = Number(req.query.timezone_offset_minutes || 0);
  if (
    !isISODate(date) ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > 90 ||
    !Number.isInteger(timezoneOffset) ||
    timezoneOffset < -840 ||
    timezoneOffset > 840
  ) {
    return res.status(400).json({ message: "A valid date and 1–90 day range are required." });
  }
  try {
    const [scheduleResult, meals, water, activities, sleep, workouts, legacy] =
      await Promise.all([
        pool.query("SELECT habit_key, weekdays, target_value, enabled FROM scheduled_habits WHERE user_id = $1", [req.user.id]),
        pool.query("SELECT recommendation_date, meal_type, status FROM recommended_meals WHERE user_id = $1 AND recommendation_date BETWEEN $2::date - ($3::int - 1) AND $2::date", [req.user.id, date, days]),
        pool.query("SELECT entry_date, SUM(amount_ml) AS total_ml FROM daily_water_entries WHERE user_id = $1 AND entry_date BETWEEN $2::date - ($3::int - 1) AND $2::date GROUP BY entry_date", [req.user.id, date, days]),
        pool.query("SELECT activity_date, SUM(steps) AS steps FROM daily_activity_entries WHERE user_id = $1 AND activity_date BETWEEN $2::date - ($3::int - 1) AND $2::date GROUP BY activity_date", [req.user.id, date, days]),
        pool.query("SELECT sleep_date FROM sleep_logs WHERE user_id = $1 AND sleep_date BETWEEN $2::date - ($3::int - 1) AND $2::date", [req.user.id, date, days]),
        pool.query("SELECT workout_date, BOOL_OR(completed) AS completed FROM workout_logs WHERE user_id = $1 AND workout_date BETWEEN $2::date - ($3::int - 1) AND $2::date GROUP BY workout_date", [req.user.id, date, days]),
        pool.query("SELECT activity_date, steps, water_liters, recovery_rating FROM daily_wellness_logs WHERE user_id = $1 AND activity_date BETWEEN $2::date - ($3::int - 1) AND $2::date", [req.user.id, date, days]),
      ]);
    const schedules = scheduleResult.rows;
    const profile = await pool.query("SELECT steps_goal, hydration_goal_ml FROM users WHERE user_id = $1", [req.user.id]);
    const stepGoal = Number(profile.rows[0]?.steps_goal || 8000);
    const waterGoal = Number(profile.rows[0]?.hydration_goal_ml || 2000);
    const histories = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const current = new Date(`${date}T00:00:00Z`);
      current.setUTCDate(current.getUTCDate() - offset);
      const currentDate = current.toISOString().slice(0, 10);
      const completions = {};
      for (const meal of meals.rows.filter((item) => toISODate(item.recommendation_date) === currentDate)) {
        completions[`meal:${meal.meal_type}`] = meal.status === "completed"
          ? true
          : meal.status === "skipped"
            ? false
            : null;
      }
      const waterEntry = water.rows.find((item) => toISODate(item.entry_date) === currentDate);
      const activityEntry = activities.rows.find((item) => toISODate(item.activity_date) === currentDate);
      const legacyEntry = legacy.rows.find((item) => toISODate(item.activity_date) === currentDate);
      if (waterEntry || legacyEntry?.water_liters != null) {
        const total = waterEntry
          ? Number(waterEntry.total_ml || 0)
          : Number(legacyEntry?.water_liters || 0) * 1000;
        completions.water = total >= waterGoal;
      }
      if (activityEntry?.steps != null || legacyEntry?.steps != null) {
        const total = activityEntry
          ? Number(activityEntry.steps || 0)
          : Number(legacyEntry?.steps || 0);
        completions.steps = total >= stepGoal;
      }
      if (sleep.rows.some((item) => toISODate(item.sleep_date) === currentDate)) completions.sleep = true;
      const workout = workouts.rows.find((item) => toISODate(item.workout_date) === currentDate);
      if (workout) completions.workout = Boolean(workout.completed);
      histories.push(calculateConsistency({
        date: currentDate,
        schedules,
        completionByHabit: completions,
        todayDate: getTodayAtOffset(timezoneOffset),
      }));
    }
    const eligible = histories.filter((entry) => entry.total > 0);
    const eligibleTotal = eligible.reduce((sum, entry) => sum + entry.total, 0);
    const eligibleCompleted = eligible.reduce((sum, entry) => sum + entry.completed, 0);
    const weekly = eligibleTotal
      ? Math.round((eligibleCompleted / eligibleTotal) * 100)
      : null;
    return res.json({
      daily: histories[histories.length - 1],
      weekly_percentage: weekly,
      history: histories,
      formula: "Completed scheduled and recorded habits divided by eligible scheduled and recorded habits. Unrecorded habits remain unknown, not failed. Rest days are not scheduled workouts.",
    });
  } catch (error) {
    console.error("Calculate consistency:", error);
    return res.status(500).json({ message: "Unable to calculate consistency." });
  }
});

router.get("/recovery", async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const days = Number(req.query.days || 14);
  if (!isISODate(date) || !Number.isInteger(days) || days < 1 || days > 90) {
    return res.status(400).json({ message: "A valid date and 1–90 day range are required." });
  }
  try {
    const [sleep, wellness, workoutRows] = await Promise.all([
      pool.query("SELECT sleep_date, duration_minutes, sleep_quality, fatigue_rating, soreness_rating FROM sleep_logs WHERE user_id = $1 AND sleep_date BETWEEN $2::date - ($3::int - 1) AND $2::date ORDER BY sleep_date", [req.user.id, date, days]),
      pool.query("SELECT activity_date, recovery_rating FROM daily_wellness_logs WHERE user_id = $1 AND activity_date BETWEEN $2::date - ($3::int - 1) AND $2::date", [req.user.id, date, days]),
      pool.query("SELECT workout_date, duration_minutes FROM workout_logs WHERE user_id = $1 AND completed = TRUE AND workout_date BETWEEN $2::date - ($3::int - 1) AND $2::date ORDER BY workout_date", [req.user.id, date, days]),
    ]);
    const history = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const current = new Date(`${date}T00:00:00Z`);
      current.setUTCDate(current.getUTCDate() - offset);
      const currentDate = current.toISOString().slice(0, 10);
      const recentWorkouts = workoutRows.rows.filter((item) => {
        const workoutDate = new Date(`${toISODate(item.workout_date)}T00:00:00Z`);
        const age = Math.floor(
          (new Date(`${currentDate}T00:00:00Z`) - workoutDate) / 86400000
        );
        return age >= 0 && age < 7;
      });
      const sleepEntry = sleep.rows.find((item) => toISODate(item.sleep_date) === currentDate);
      const wellnessEntry = wellness.rows.find((item) => toISODate(item.activity_date) === currentDate);
      const result = calculateRecovery({
        sleep: sleepEntry,
        recentWorkouts,
        workoutsKnown: recentWorkouts.length > 0,
        wellness: wellnessEntry,
      });
      history.push({ date: currentDate, ...result });
      if (result.score !== null) {
        await pool.query(
          `INSERT INTO recovery_records (user_id, recovery_date, score, factors)
           VALUES ($1, $2, $3, $4::jsonb)
           ON CONFLICT (user_id, recovery_date)
           DO UPDATE SET score = EXCLUDED.score, factors = EXCLUDED.factors, updated_at = NOW()`,
          [req.user.id, currentDate, result.score, JSON.stringify(result.factors)]
        );
      }
    }
    return res.json({ current: history[history.length - 1], history });
  } catch (error) {
    console.error("Calculate recovery history:", error);
    return res.status(500).json({ message: "Unable to calculate recovery history." });
  }
});

module.exports = router;
