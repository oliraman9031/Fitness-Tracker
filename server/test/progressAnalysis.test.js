const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateBMI,
  calculateConsistency,
  calculateRecovery,
  summarizeProgress,
} = require("../services/progressAnalysisService");
const { toISODate } = require("../utils/dateValidation");

test("BMI requires valid weight and height and returns a screening note", () => {
  assert.equal(calculateBMI(70, null), null);
  assert.equal(calculateBMI(-2, 170), null);
  assert.deepEqual(calculateBMI(70, 170), {
    value: 24.2,
    category: "Within range",
    note: "BMI is a screening measure, not a diagnosis. It does not account for body composition.",
  });
});

test("recovery omits missing inputs instead of inventing a score", () => {
  assert.equal(calculateRecovery({}).score, null);
  const result = calculateRecovery({
    sleep: { duration_minutes: 480, sleep_quality: 4 },
  });
  assert.equal(result.score, 92);
  assert.deepEqual(result.factors.map((factor) => factor.key), [
    "sleep_duration",
    "sleep_quality",
  ]);
  assert.match(result.explanation, /Missing inputs are omitted/);
});

test("consistency excludes unrecorded habits and scheduled rest days", () => {
  const today = new Date().toISOString().slice(0, 10);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const restDay = (weekday + 1) % 7;
  const result = calculateConsistency({
    date: today,
    schedules: [
      { habit_key: "water", enabled: true, weekdays: [weekday] },
      { habit_key: "workout", enabled: true, weekdays: [restDay] },
      { habit_key: "steps", enabled: true, weekdays: [weekday] },
    ],
    completionByHabit: { water: true },
  });

  assert.equal(result.total, 1);
  assert.equal(result.completed, 1);
  assert.equal(result.percentage, 100);
});

test("consistency scores only explicitly recorded scheduled outcomes", () => {
  const today = new Date().toISOString().slice(0, 10);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const result = calculateConsistency({
    date: today,
    schedules: [
      { habit_key: "water", enabled: true, weekdays: [weekday] },
      { habit_key: "steps", enabled: true, weekdays: [weekday] },
    ],
    completionByHabit: { water: false },
  });

  assert.equal(result.total, 1);
  assert.equal(result.completed, 0);
  assert.equal(result.percentage, 0);
});

test("consistency uses the user's local date when UTC is still on the prior day", () => {
  const result = calculateConsistency({
    date: "2026-10-31",
    todayDate: "2026-10-31",
    schedules: [
      { habit_key: "water", enabled: true, weekdays: [6] },
    ],
    completionByHabit: { water: true },
  });
  assert.equal(result.percentage, 100);
});

test("consistency excludes dates beyond the user's local today", () => {
  const result = calculateConsistency({
    date: "2026-11-01",
    todayDate: "2026-10-31",
    schedules: [
      { habit_key: "water", enabled: true, weekdays: [0] },
    ],
    completionByHabit: { water: true },
  });
  assert.equal(result.percentage, null);
});

test("database DATE values retain their calendar day in the server timezone", () => {
  const databaseDate = new Date(2026, 9, 31);
  assert.equal(toISODate(databaseDate), "2026-10-31");
  assert.equal(toISODate("2026-10-31"), "2026-10-31");
});

test("progress summary leaves unrecorded metrics unavailable", () => {
  const summary = summarizeProgress({
    weight: [],
    meals: [],
    water: {},
    steps: {},
    workouts: {},
    sleep: {},
    recovery: {},
    consistency: {},
  });

  assert.equal(summary.currentDay.weightKg, null);
  assert.equal(summary.currentDay.waterMl, null);
  assert.equal(summary.currentDay.steps, null);
  assert.equal(summary.currentDay.recoveryScore, null);
});
