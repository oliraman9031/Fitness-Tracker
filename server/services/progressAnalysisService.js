const HABIT_WEIGHTS = {
  "meal:Breakfast": 1,
  "meal:Lunch": 1,
  "meal:Snack": 1,
  "meal:Dinner": 1,
  water: 1,
  steps: 1,
  sleep: 1,
  workout: 1,
};

function calculateBMI(weightKg, heightCm) {
  const weight = Number(weightKg);
  const height = Number(heightCm);
  if (
    !Number.isFinite(weight) ||
    weight <= 0 ||
    !Number.isFinite(height) ||
    height < 80 ||
    height > 250
  ) {
    return null;
  }
  const bmi = weight / ((height / 100) ** 2);
  return {
    value: Number(bmi.toFixed(1)),
    category:
      bmi < 18.5 ? "Below range" :
      bmi < 25 ? "Within range" :
      bmi < 30 ? "Above range" : "High range",
    note: "BMI is a screening measure, not a diagnosis. It does not account for body composition.",
  };
}

function calculateRecovery({
  sleep,
  recentWorkouts = [],
  workoutsKnown = false,
  wellness,
}) {
  const factors = [];
  const addFactor = (key, label, score, weight, detail) => {
    if (Number.isFinite(score)) {
      factors.push({ key, label, score, weight, detail });
    }
  };

  if (sleep && Number.isFinite(Number(sleep.duration_minutes))) {
    const hours = Number(sleep.duration_minutes) / 60;
    const score = hours >= 7 && hours <= 9
      ? 100
      : hours >= 6
        ? 75
        : hours >= 5
          ? 50
          : 25;
    addFactor(
      "sleep_duration",
      "Sleep duration",
      score,
      30,
      `${hours.toFixed(1)} hours recorded`
    );
  }

  if (sleep?.sleep_quality != null) {
    const quality = Number(sleep.sleep_quality);
    addFactor(
      "sleep_quality",
      "Sleep quality",
      ((quality - 1) / 4) * 100,
      15,
      `Self-reported ${quality} out of 5`
    );
  }

  if (sleep?.fatigue_rating != null) {
    const fatigue = Number(sleep.fatigue_rating);
    addFactor(
      "fatigue",
      "Fatigue",
      ((5 - fatigue) / 4) * 100,
      15,
      `Self-reported fatigue ${fatigue} out of 5`
    );
  } else if (wellness?.recovery_rating != null) {
    const recovery = Number(wellness.recovery_rating);
    addFactor(
      "self_reported_recovery",
      "Self-reported recovery",
      ((recovery - 1) / 4) * 100,
      15,
      `Self-reported ${recovery} out of 5`
    );
  }

  if (sleep?.soreness_rating != null) {
    const soreness = Number(sleep.soreness_rating);
    addFactor(
      "soreness",
      "Muscle soreness",
      ((5 - soreness) / 4) * 100,
      15,
      `Self-reported soreness ${soreness} out of 5`
    );
  }

  if (workoutsKnown) {
    const sessions = recentWorkouts.reduce(
      (total, workout) => total + Number(workout.count ?? 1),
      0
    );
    const minutes = recentWorkouts.reduce(
      (total, workout) =>
        total + Number(workout.duration_minutes ?? workout.minutes ?? 0),
      0
    );
    const score = sessions <= 3 ? 100 : sessions === 4 ? 80 : sessions === 5 ? 60 : 40;
    addFactor(
      "recent_workload",
      "Recent workout load",
      score,
      25,
      `${sessions} workout${sessions === 1 ? "" : "s"}, ${minutes} minutes in the last 7 days; rest days are not penalized`
    );
  }

  if (!factors.length) {
    return {
      score: null,
      factors: [],
      explanation: "Not enough sleep, recovery, or workout data to calculate an indicator.",
    };
  }

  const weightTotal = factors.reduce((total, factor) => total + factor.weight, 0);
  const score = Math.round(
    factors.reduce((total, factor) => total + factor.score * factor.weight, 0) /
      weightTotal
  );
  return {
    score,
    factors,
    explanation:
      "Weighted average of available indicators only: sleep duration (30), sleep quality (15), fatigue (15), soreness (15), and recent workout load (25). Missing inputs are omitted and remaining weights are rebalanced. This is a wellness indicator, not a medical assessment.",
  };
}

function isScheduled(schedule, date) {
  if (!schedule.enabled) return false;
  const weekdays = Array.isArray(schedule.weekdays)
    ? schedule.weekdays
    : [];
  return weekdays.includes(new Date(`${date}T00:00:00Z`).getUTCDay());
}

function calculateConsistency({
  date,
  schedules,
  completionByHabit,
  todayDate = new Date().toISOString().slice(0, 10),
}) {
  const today = new Date(`${date}T00:00:00Z`);
  const currentDate = new Date(`${todayDate}T00:00:00Z`);
  if (today > currentDate) {
    return { date, percentage: null, completed: 0, total: 0, habits: [] };
  }

  const habits = [];
  for (const schedule of schedules) {
    if (!isScheduled(schedule, date)) continue;
    const status = completionByHabit[schedule.habit_key];
    if (status !== true && status !== false) continue;
    habits.push({
      key: schedule.habit_key,
      completed: status,
      weight: HABIT_WEIGHTS[schedule.habit_key] || 1,
    });
  }
  const total = habits.reduce((sum, habit) => sum + habit.weight, 0);
  const completed = habits.reduce(
    (sum, habit) => sum + (habit.completed ? habit.weight : 0),
    0
  );

  return {
    date,
    percentage: total ? Math.round((completed / total) * 100) : null,
    completed,
    total,
    habits,
  };
}

function summarizeProgress({ weight, meals, water, steps, workouts, sleep, recovery, consistency }) {
  const currentWeight = weight[weight.length - 1] || null;
  const previousWeight = weight.length > 1 ? weight[weight.length - 2] : null;
  const splitIndex = Math.max(0, weight.length - 8);
  const currentWeekWeights = weight.slice(splitIndex);
  const previousWeekWeights = weight.slice(Math.max(0, splitIndex - 7), splitIndex);
  const average = (values, key) => {
    const numeric = values.map((value) => Number(value[key])).filter(Number.isFinite);
    return numeric.length
      ? Number((numeric.reduce((sum, value) => sum + value, 0) / numeric.length).toFixed(1))
      : null;
  };
  const mealCompleted = meals.filter((meal) => meal.status === "completed").length;
  const mealSkipped = meals.filter((meal) => meal.status === "skipped").length;

  return {
    generatedAt: new Date().toISOString(),
    currentDay: {
      weightKg: currentWeight ? Number(currentWeight.weight) : null,
      mealCheckInsCompleted: mealCompleted,
      mealCheckInsExplicitlySkipped: mealSkipped,
      mealsNotCheckedIn: meals.filter((meal) => meal.status === "planned").length,
      waterMl: water?.total_ml == null ? null : Number(water.total_ml),
      steps: steps?.total_steps == null ? null : Number(steps.total_steps),
      activeMinutes: steps?.active_minutes == null ? null : Number(steps.active_minutes),
      workoutCount: workouts?.count == null ? null : Number(workouts.count),
      sleepHours: sleep?.duration_minutes == null
        ? null
        : Number((Number(sleep.duration_minutes) / 60).toFixed(1)),
      recoveryScore: recovery?.score == null ? null : Number(recovery.score),
      consistencyPercentage: consistency?.percentage ?? null,
    },
    comparisons: {
      weightChangeSincePreviousRecord: currentWeight && previousWeight
        ? Number((Number(currentWeight.weight) - Number(previousWeight.weight)).toFixed(1))
        : null,
      currentWeekAverageWeight: average(currentWeekWeights, "weight"),
      previousWeekAverageWeight: average(previousWeekWeights, "weight"),
      currentWeekWaterMl: water?.week_total_ml == null ? null : Number(water.week_total_ml),
      previousWeekWaterMl: water?.previous_week_total_ml == null
        ? null
        : Number(water.previous_week_total_ml),
      currentWeekSteps: steps?.week_total_steps == null ? null : Number(steps.week_total_steps),
      previousWeekSteps: steps?.previous_week_total_steps == null
        ? null
        : Number(steps.previous_week_total_steps),
      currentWeekWorkouts: workouts?.week_count == null ? null : Number(workouts.week_count),
      previousWeekWorkouts: workouts?.previous_week_count == null
        ? null
        : Number(workouts.previous_week_count),
      currentWeekAverageSleepHours: sleep?.week_average_minutes == null
        ? null
        : Number((Number(sleep.week_average_minutes) / 60).toFixed(1)),
      previousWeekAverageSleepHours: sleep?.previous_week_average_minutes == null
        ? null
        : Number((Number(sleep.previous_week_average_minutes) / 60).toFixed(1)),
      currentWeekAverageRecovery: recovery?.week_average == null
        ? null
        : Number(recovery.week_average),
      previousWeekAverageRecovery: recovery?.previous_week_average == null
        ? null
        : Number(recovery.previous_week_average),
      currentWeekConsistency: consistency?.weekly_percentage ?? null,
      previousWeekConsistency: consistency?.previous_week_percentage ?? null,
    },
    dataCoverage: {
      weightRecords: weight.length,
      mealRecommendations: meals.length,
      waterEntries: water?.entry_count ?? null,
      activityRecords: steps?.record_count ?? null,
      workoutRecords: workouts?.count ?? null,
      sleepRecords: sleep?.record_count ?? null,
      recoveryRecords: recovery?.record_count ?? null,
    },
  };
}

module.exports = {
  calculateBMI,
  calculateRecovery,
  calculateConsistency,
  summarizeProgress,
};
