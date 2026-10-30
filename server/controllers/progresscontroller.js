const pool = require("../database");
const {
    getTodayAtOffset,
    isISODate,
    toISODate,
} = require("../utils/dateValidation");
const {
    calculateBMI,
    calculateConsistency,
    calculateRecovery,
    summarizeProgress,
} = require("../services/progressAnalysisService");

const addProgress = async (req, res) => {
    try {
        const { weight } = req.body;
        const result = await pool.query(
            `INSERT INTO progress_records (user_id, weight)
             VALUES ($1, $2)
             RETURNING *`,
            [req.user.id, Number(weight)]
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
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Failed to load progress records:", error);
        res.status(500).json({ message: "Unable to load progress records" });
    }
};

const getAnalysis = async (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const timezoneOffset = Number(req.query.timezone_offset_minutes || 0);
    if (
        !isISODate(date) ||
        !Number.isInteger(timezoneOffset) ||
        timezoneOffset < -840 ||
        timezoneOffset > 840
    ) {
        return res.status(400).json({ message: "A valid analysis date is required." });
    }

    try {
        const [profile, weights, meals, water, activities, workouts, sleep, wellness, recovery, schedules] =
            await Promise.all([
                pool.query(
                    `SELECT height_cm, hydration_goal_ml, steps_goal, profile_preferences
                     FROM users WHERE user_id = $1`,
                    [req.user.id]
                ),
                pool.query(
                    `SELECT recorded_date, weight FROM progress_records
                     WHERE user_id = $1 AND recorded_date < $2::date + INTERVAL '1 day'
                     ORDER BY recorded_date DESC LIMIT 30`,
                    [req.user.id, date]
                ),
                pool.query(
                    `SELECT recommendation_date, meal_type, status
                     FROM recommended_meals
                     WHERE user_id = $1 AND recommendation_date BETWEEN $2::date - 13 AND $2::date`,
                    [req.user.id, date]
                ),
                pool.query(
                    `SELECT entry_date AS activity_date, SUM(amount_ml) AS total_ml,
                            COUNT(*) AS entry_count
                     FROM daily_water_entries
                     WHERE user_id = $1 AND entry_date BETWEEN $2::date - 13 AND $2::date
                     GROUP BY entry_date`,
                    [req.user.id, date]
                ),
                pool.query(
                    `SELECT activity_date, SUM(steps) AS total_steps,
                            SUM(active_minutes) AS active_minutes,
                            COUNT(*) AS record_count
                     FROM daily_activity_entries
                     WHERE user_id = $1 AND activity_date BETWEEN $2::date - 13 AND $2::date
                     GROUP BY activity_date`,
                    [req.user.id, date]
                ),
                pool.query(
                    `SELECT workout_date, COUNT(*) FILTER (WHERE completed) AS count,
                            SUM(duration_minutes) FILTER (WHERE completed) AS minutes
                     FROM workout_logs
                     WHERE user_id = $1 AND workout_date BETWEEN $2::date - 13 AND $2::date
                     GROUP BY workout_date`,
                    [req.user.id, date]
                ),
                pool.query(
                    `SELECT sleep_date, duration_minutes, sleep_quality,
                            fatigue_rating, soreness_rating
                     FROM sleep_logs
                     WHERE user_id = $1 AND sleep_date BETWEEN $2::date - 13 AND $2::date`,
                    [req.user.id, date]
                ),
                pool.query(
                    `SELECT activity_date, steps, water_liters, sleep_hours, recovery_rating
                     FROM daily_wellness_logs
                     WHERE user_id = $1 AND activity_date BETWEEN $2::date - 13 AND $2::date`,
                    [req.user.id, date]
                ),
                pool.query(
                    `SELECT recovery_date, score, factors
                     FROM recovery_records
                     WHERE user_id = $1 AND recovery_date BETWEEN $2::date - 13 AND $2::date`,
                    [req.user.id, date]
                ),
                pool.query(
                    `SELECT habit_key, weekdays, target_value, enabled
                     FROM scheduled_habits WHERE user_id = $1`,
                    [req.user.id]
                ),
            ]);

        const recentWeights = weights.rows.reverse();
        const stepsGoal = Number(profile.rows[0]?.steps_goal || 8000);
        const waterGoal = Number(profile.rows[0]?.hydration_goal_ml || 2000);
        const history = [];
        for (let offset = 13; offset >= 0; offset -= 1) {
            const day = new Date(`${date}T00:00:00Z`);
            day.setUTCDate(day.getUTCDate() - offset);
            const dayKey = day.toISOString().slice(0, 10);
            const atDate = (record, field) => toISODate(record[field]) === dayKey;
            const dayMeals = meals.rows.filter((record) => atDate(record, "recommendation_date"));
            const waterEntry = water.rows.find((record) => atDate(record, "activity_date"));
            const activityEntry = activities.rows.find((record) => atDate(record, "activity_date"));
            const legacyEntry = wellness.rows.find((record) => atDate(record, "activity_date"));
            const sleepEntry = sleep.rows.find((record) => atDate(record, "sleep_date"));
            const workoutEntry = workouts.rows.find((record) => atDate(record, "workout_date"));
            const recoveryEntry = recovery.rows.find((record) => atDate(record, "recovery_date"));
            const waterMl = waterEntry
                ? Number(waterEntry.total_ml)
                : legacyEntry
                    ? Number(legacyEntry.water_liters) * 1000
                    : null;
            const steps = activityEntry
                ? activityEntry.total_steps == null
                    ? null
                    : Number(activityEntry.total_steps)
                : legacyEntry
                    ? Number(legacyEntry.steps)
                    : null;
            const completions = {};
            for (const meal of dayMeals) {
                completions[`meal:${meal.meal_type}`] =
                    meal.status === "completed" ? true :
                    meal.status === "skipped" ? false : null;
            }
            if (waterMl !== null) completions.water = waterMl >= waterGoal;
            if (steps !== null) completions.steps = steps >= stepsGoal;
            if (sleepEntry) completions.sleep = true;
            if (workoutEntry) completions.workout = Number(workoutEntry.count) > 0;
            const consistency = calculateConsistency({
                date: dayKey,
                schedules: schedules.rows,
                completionByHabit: completions,
                todayDate: getTodayAtOffset(timezoneOffset),
            });
            const recentWorkouts = workouts.rows.filter((workout) => {
                const workoutDate = new Date(`${toISODate(workout.workout_date)}T00:00:00Z`);
                const difference = (day.getTime() - workoutDate.getTime()) / 86400000;
                return difference >= 0 && difference < 7;
            });
            const recoveryResult = calculateRecovery({
                sleep: sleepEntry,
                recentWorkouts,
                workoutsKnown: recentWorkouts.length > 0,
                wellness: legacyEntry,
            });
            history.push({
                date: dayKey,
                steps,
                waterMl,
                activeMinutes: activityEntry ? Number(activityEntry.active_minutes) : null,
                workoutCount: workoutEntry ? Number(workoutEntry.count) : null,
                sleepHours: sleepEntry ? Number((sleepEntry.duration_minutes / 60).toFixed(1)) :
                    legacyEntry?.sleep_hours != null ? Number(legacyEntry.sleep_hours) : null,
                recoveryScore: recoveryEntry ? Number(recoveryEntry.score) : recoveryResult.score,
                consistency: consistency.percentage,
                consistencyTotal: consistency.total,
                consistencyCompleted: consistency.completed,
                mealCheckIns: {
                    completed: dayMeals.filter((meal) => meal.status === "completed").length,
                    skipped: dayMeals.filter((meal) => meal.status === "skipped").length,
                    unchecked: dayMeals.filter((meal) => meal.status === "planned").length,
                },
            });
        }

        const latestWeight = recentWeights[recentWeights.length - 1] || null;
        const previousWeight = recentWeights.length > 1
            ? recentWeights[recentWeights.length - 2]
            : null;
        const calculateWeek = (rows, key, from, to) => {
            const selected = rows.filter((row) => {
                const value = toISODate(row[key]);
                return value >= from && value <= to;
            });
            return selected;
        };
        const dateValue = new Date(`${date}T00:00:00Z`);
        const previousEnd = new Date(dateValue);
        previousEnd.setUTCDate(previousEnd.getUTCDate() - 7);
        const previousStart = new Date(previousEnd);
        previousStart.setUTCDate(previousStart.getUTCDate() - 6);
        const currentStart = new Date(dateValue);
        currentStart.setUTCDate(currentStart.getUTCDate() - 6);
        const dateText = (value) => value.toISOString().slice(0, 10);
        const currentWeightWeek = calculateWeek(recentWeights, "recorded_date", dateText(currentStart), date);
        const previousWeightWeek = calculateWeek(recentWeights, "recorded_date", dateText(previousStart), dateText(previousEnd));
        const currentDay = history[history.length - 1];
        const currentWeek = history.slice(-7);
        const previousWeek = history.slice(0, 7);
        const averageOf = (values) => values.length
            ? Number((values.reduce((sum, item) => sum + item, 0) / values.length).toFixed(1))
            : null;
        const summary = summarizeProgress({
            weight: recentWeights,
            meals: meals.rows.filter((meal) => atDateForDate(meal, "recommendation_date", date)),
            water: { total_ml: currentDay.waterMl },
            steps: { total_steps: currentDay.steps, active_minutes: currentDay.activeMinutes },
            workouts: { count: currentDay.workoutCount },
            sleep: { duration_minutes: currentDay.sleepHours === null ? null : currentDay.sleepHours * 60 },
            recovery: { score: currentDay.recoveryScore },
            consistency: { percentage: currentDay.consistency },
        });
        summary.bmi = calculateBMI(latestWeight?.weight, profile.rows[0]?.height_cm);
        summary.heightCm = profile.rows[0]?.height_cm == null
            ? null
            : Number(profile.rows[0].height_cm);
        summary.comparisons.currentWeekAverageWeight = averageOf(
            currentWeightWeek.map((row) => Number(row.weight))
        );
        summary.comparisons.previousWeekAverageWeight = averageOf(
            previousWeightWeek.map((row) => Number(row.weight))
        );
        const consistencyPercentage = (rows) => {
            const total = rows.reduce((sum, row) => sum + Number(row.consistencyTotal || 0), 0);
            return total
                ? Math.round(
                    (rows.reduce((sum, row) => sum + Number(row.consistencyCompleted || 0), 0) /
                        total) *
                        100
                )
                : null;
        };
        summary.comparisons.currentWeekConsistency = consistencyPercentage(currentWeek);
        summary.comparisons.previousWeekConsistency = consistencyPercentage(previousWeek);
        const weekTotal = (rows, key) => {
            const values = rows.map((row) => row[key]).filter((value) => value !== null);
            return values.length ? values.reduce((sum, value) => sum + Number(value), 0) : null;
        };
        const weekAverage = (rows, key) => {
            const values = rows.map((row) => row[key]).filter((value) => value !== null);
            return values.length
                ? Number((values.reduce((sum, value) => sum + Number(value), 0) / values.length).toFixed(1))
                : null;
        };
        summary.comparisons.currentWeekSteps = weekTotal(currentWeek, "steps");
        summary.comparisons.previousWeekSteps = weekTotal(previousWeek, "steps");
        summary.comparisons.currentWeekWaterMl = weekTotal(currentWeek, "waterMl");
        summary.comparisons.previousWeekWaterMl = weekTotal(previousWeek, "waterMl");
        summary.comparisons.currentWeekWorkouts = weekTotal(currentWeek, "workoutCount");
        summary.comparisons.previousWeekWorkouts = weekTotal(previousWeek, "workoutCount");
        summary.comparisons.currentWeekAverageSleepHours = weekAverage(currentWeek, "sleepHours");
        summary.comparisons.previousWeekAverageSleepHours = weekAverage(previousWeek, "sleepHours");
        summary.comparisons.currentWeekAverageRecovery = weekAverage(currentWeek, "recoveryScore");
        summary.comparisons.previousWeekAverageRecovery = weekAverage(previousWeek, "recoveryScore");
        return res.json({ summary, history });
    } catch (error) {
        console.error("Analyze progress:", error);
        return res.status(500).json({ message: "Unable to analyze progress." });
    }
};

function atDateForDate(record, field, date) {
    return toISODate(record[field]) === date;
}

module.exports = { addProgress, getProgress, getAnalysis };
