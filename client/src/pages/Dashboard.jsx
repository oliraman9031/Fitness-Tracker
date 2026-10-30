import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import WorkoutCard from "../components/WorkoutCard";
import ActivityCard from "../components/ActivityChart";
import ProgressChart from "../components/PorgressChart";
import WellnessTrendChart from "../components/WellnessTrendChart";
import {
  addActivity,
  addWater,
  getActivities,
  getConsistency,
  getDailySummary,
  getHabitSchedule,
  getProgress,
  getProgressAnalysis,
  getRecovery,
  getRecommendedMeals,
  getRecommendations,
  getSleep,
  getWater,
  getWellnessLog,
  getWellnessProfile,
  removeActivity,
  removeWater,
  saveHabitSchedule,
  saveRecommendedMeals,
  saveSleep,
  saveWorkout,
  updateRecommendedMeal,
  updateWellnessProfile,
} from "../services/foodApi";

const nutritionMetrics = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
  { key: "sugar", label: "Sugar", unit: "g" },
  { key: "sodium", label: "Sodium", unit: "mg" },
];

function localDate() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

const habitOptions = [
  ["meal:Breakfast", "Breakfast"],
  ["meal:Lunch", "Lunch"],
  ["meal:Snack", "Snack"],
  ["meal:Dinner", "Dinner"],
  ["water", "Hydration goal"],
  ["steps", "Step goal"],
  ["sleep", "Sleep log"],
];
const weekdayOptions = [
  [0, "Sun"],
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
];

function Dashboard() {
  const navigate = useNavigate();
  const date = localDate();
  const [nutrition, setNutrition] = useState(null);
  const [dailyActivity, setDailyActivity] = useState(null);
  const [wellness, setWellness] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [coachError, setCoachError] = useState("");
  const [coach, setCoach] = useState(null);
  const [water, setWater] = useState(null);
  const [waterAmount, setWaterAmount] = useState("250");
  const [activityEntries, setActivityEntries] = useState([]);
  const [activityForm, setActivityForm] = useState({
    activity_type: "Walking",
    steps: "",
    distance_m: "",
    active_minutes: "",
  });
  const [sleep, setSleep] = useState(null);
  const [sleepForm, setSleepForm] = useState({
    duration_hours: "",
    sleep_quality: "",
    fatigue_rating: "",
    soreness_rating: "",
  });
  const [profile, setProfile] = useState({
    height_cm: "",
    hydration_goal_ml: "2000",
    steps_goal: "8000",
    profile_preferences: {},
  });
  const [recommendedMeals, setRecommendedMeals] = useState([]);
  const [consistency, setConsistency] = useState(null);
  const [recovery, setRecovery] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [workoutWeekdays, setWorkoutWeekdays] = useState([]);
  const [savingTracking, setSavingTracking] = useState(false);

  async function refreshTracking() {
    const [
      summary,
      waterResult,
      activityResult,
      sleepResult,
      mealResult,
      consistencyResult,
      recoveryResult,
      analysisResult,
    ] = await Promise.all([
      getDailySummary(date),
      getWater(date),
      getActivities(date),
      getSleep(date),
      getRecommendedMeals(date),
      getConsistency(date, 14),
      getRecovery(date, 14),
      getProgressAnalysis(date),
    ]);
    setNutrition(summary.nutrition);
    setDailyActivity(summary.activity);
    setWater(waterResult);
    setActivityEntries(activityResult.entries || []);
    setSleep(sleepResult.sleep);
    setSleepForm(sleepResult.sleep
      ? {
          duration_hours: String(Number(sleepResult.sleep.duration_minutes) / 60),
          sleep_quality: String(sleepResult.sleep.sleep_quality || ""),
          fatigue_rating: String(sleepResult.sleep.fatigue_rating || ""),
          soreness_rating: String(sleepResult.sleep.soreness_rating || ""),
        }
      : {
          duration_hours: "",
          sleep_quality: "",
          fatigue_rating: "",
          soreness_rating: "",
        });
    setRecommendedMeals(mealResult.meals || []);
    setConsistency(consistencyResult);
    setRecovery(recoveryResult);
    setAnalysis(analysisResult);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      getDailySummary(date),
      getWellnessLog(date),
      getProgress(),
      getWater(date),
      getActivities(date),
      getSleep(date),
      getWellnessProfile(),
      getRecommendedMeals(date),
      getConsistency(date, 14),
      getRecovery(date, 14),
      getProgressAnalysis(date),
      getHabitSchedule(),
    ])
      .then(([
        summary,
        wellnessResult,
        progress,
        waterResult,
        activityResult,
        sleepResult,
        profileResult,
        mealResult,
        consistencyResult,
        recoveryResult,
        analysisResult,
        scheduleResult,
      ]) => {
        if (!active) return;
        setNutrition(summary.nutrition);
        setDailyActivity(summary.activity);
        setWellness(wellnessResult.log);
        setProgressData(progress.map((entry) => ({
          date: new Date(entry.recorded_date).toLocaleDateString(),
          weight: Number(entry.weight),
        })));
        setWater(waterResult);
        setActivityEntries(activityResult.entries || []);
        setSleep(sleepResult.sleep);
        if (sleepResult.sleep) {
          setSleepForm({
            duration_hours: String(Number(sleepResult.sleep.duration_minutes) / 60),
            sleep_quality: String(sleepResult.sleep.sleep_quality || ""),
            fatigue_rating: String(sleepResult.sleep.fatigue_rating || ""),
            soreness_rating: String(sleepResult.sleep.soreness_rating || ""),
          });
        }
        setProfile({
          height_cm: profileResult.profile.height_cm == null
            ? ""
            : String(profileResult.profile.height_cm),
          hydration_goal_ml: String(profileResult.profile.hydration_goal_ml),
          steps_goal: String(profileResult.profile.steps_goal),
          profile_preferences: profileResult.profile.profile_preferences || {},
        });
        setRecommendedMeals(mealResult.meals || []);
        setConsistency(consistencyResult);
        setRecovery(recoveryResult);
        setAnalysis(analysisResult);
        setSchedules(scheduleResult.schedules || []);
        setWorkoutWeekdays(
          scheduleResult.schedules?.find((item) => item.habit_key === "workout")?.weekdays || []
        );
      })
      .catch((loadError) => {
        if (!active) return;
        if (loadError.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date, navigate]);

  async function handleWaterSubmit(event) {
    event.preventDefault();
    setSavingTracking(true);
    setError("");
    try {
      await addWater(date, Number(waterAmount));
      setWaterAmount("250");
      await refreshTracking();
      setMessage("Water entry added.");
    } catch (saveError) {
      if (saveError.status === 401) navigate("/login", { replace: true });
      else setError(saveError.message);
    } finally {
      setSavingTracking(false);
    }
  }

  async function handleRemoveWater(entryId) {
    setError("");
    try {
      await removeWater(entryId);
      await refreshTracking();
      setMessage("Water entry removed.");
    } catch (removeError) {
      setError(removeError.message);
    }
  }

  async function handleActivitySubmit(event) {
    event.preventDefault();
    setSavingTracking(true);
    setError("");
    try {
      await addActivity({
        activity_date: date,
        activity_type: activityForm.activity_type,
        steps: activityForm.steps === "" ? null : Number(activityForm.steps),
        distance_m: activityForm.distance_m === "" ? null : Number(activityForm.distance_m),
        active_minutes: activityForm.active_minutes === "" ? 0 : Number(activityForm.active_minutes),
        data_source: "manual",
      });
      setActivityForm({
        activity_type: "Walking",
        steps: "",
        distance_m: "",
        active_minutes: "",
      });
      await refreshTracking();
      setMessage("Activity entry saved.");
    } catch (saveError) {
      if (saveError.status === 401) navigate("/login", { replace: true });
      else setError(saveError.message);
    } finally {
      setSavingTracking(false);
    }
  }

  async function handleRemoveActivity(entryId) {
    setError("");
    try {
      await removeActivity(entryId);
      await refreshTracking();
      setMessage("Activity entry removed.");
    } catch (removeError) {
      setError(removeError.message);
    }
  }

  async function handleSleepSubmit(event) {
    event.preventDefault();
    setSavingTracking(true);
    setError("");
    try {
      const result = await saveSleep({
        sleep_date: date,
        duration_hours: Number(sleepForm.duration_hours),
        sleep_quality: sleepForm.sleep_quality ? Number(sleepForm.sleep_quality) : null,
        fatigue_rating: sleepForm.fatigue_rating ? Number(sleepForm.fatigue_rating) : null,
        soreness_rating: sleepForm.soreness_rating ? Number(sleepForm.soreness_rating) : null,
      });
      setSleep(result.sleep);
      await refreshTracking();
      setMessage("Sleep record saved.");
    } catch (saveError) {
      if (saveError.status === 401) navigate("/login", { replace: true });
      else setError(saveError.message);
    } finally {
      setSavingTracking(false);
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setSavingTracking(true);
    setError("");
    try {
      const updated = await updateWellnessProfile({
        height_cm: profile.height_cm === "" ? null : Number(profile.height_cm),
        hydration_goal_ml: Number(profile.hydration_goal_ml),
        steps_goal: Number(profile.steps_goal),
        profile_preferences: profile.profile_preferences,
      });
      setProfile({
        ...updated.profile,
        height_cm: updated.profile.height_cm == null ? "" : String(updated.profile.height_cm),
        hydration_goal_ml: String(updated.profile.hydration_goal_ml),
        steps_goal: String(updated.profile.steps_goal),
      });
      await refreshTracking();
      setMessage("Profile goals and preferences saved.");
    } catch (saveError) {
      if (saveError.status === 401) navigate("/login", { replace: true });
      else setError(saveError.message);
    } finally {
      setSavingTracking(false);
    }
  }

  async function toggleScheduledHabit(habitKey, enabled) {
    const updated = [
      ...habitOptions.map(([key]) => {
      const current = schedules.find((item) => item.habit_key === key);
      return {
        habit_key: key,
        weekdays: current?.weekdays || [0, 1, 2, 3, 4, 5, 6],
        target_value: current?.target_value ?? null,
        enabled: key === habitKey ? enabled : Boolean(current?.enabled),
      };
      }),
      {
        habit_key: "workout",
        weekdays: workoutWeekdays,
        target_value: null,
        enabled: workoutWeekdays.length > 0,
      },
    ];
    setError("");
    try {
      await saveHabitSchedule(updated);
      setSchedules(updated);
      await refreshTracking();
      setMessage("Consistency schedule updated.");
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function toggleWorkoutDay(day, enabled) {
    const updatedDays = enabled
      ? [...new Set([...workoutWeekdays, day])].sort()
      : workoutWeekdays.filter((scheduledDay) => scheduledDay !== day);
    const updated = [
      ...habitOptions.map(([key]) => {
        const current = schedules.find((item) => item.habit_key === key);
        return {
          habit_key: key,
          weekdays: current?.weekdays || [0, 1, 2, 3, 4, 5, 6],
          target_value: current?.target_value ?? null,
          enabled: Boolean(current?.enabled),
        };
      }),
      {
        habit_key: "workout",
        weekdays: updatedDays,
        target_value: null,
        enabled: updatedDays.length > 0,
      },
    ];
    setError("");
    try {
      await saveHabitSchedule(updated);
      setSchedules(updated);
      setWorkoutWeekdays(updatedDays);
      await refreshTracking();
      setMessage("Workout schedule updated.");
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function handleMealStatus(meal, status) {
    setError("");
    try {
      const result = await updateRecommendedMeal(meal.recommended_meal_id, status);
      setRecommendedMeals((current) => current.map((item) =>
        item.recommended_meal_id === meal.recommended_meal_id ? result.meal : item
      ));
      await refreshTracking();
      setMessage(
        status === "completed"
          ? "Meal check-in completed; nutrition remains based on actual logged food."
          : status === "skipped"
            ? "Meal explicitly marked as skipped."
            : "Meal check-in undone."
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleWorkoutSubmit(workout) {
    setSavingWorkout(true);
    setError("");
    setMessage("");
    try {
      await saveWorkout(workout);
      await refreshTracking();
      setMessage("Workout saved to today's activity.");
      return true;
    } catch (saveError) {
      if (saveError.status === 401) {
        navigate("/login", { replace: true });
      } else {
        setError(saveError.message);
      }
      return false;
    } finally {
      setSavingWorkout(false);
    }
  }

  async function handleCoachRequest() {
    setCoachLoading(true);
    setCoachError("");
    try {
      const result = await getRecommendations({
        available_time_minutes: 30,
        fitness_goal: profile.profile_preferences?.fitness_goal || "general fitness",
        preferred_activities: ["walking", "mobility"],
        diet_preference: profile.profile_preferences?.diet_preference || "no preference",
        date,
      });
      setCoach(result);
      const mealTypes = ["Breakfast", "Lunch", "Snack", "Dinner"];
      const meals = (result.recommendations.mealSuggestions || [])
        .slice(0, 4)
        .map((suggestion, index) => ({
          meal_type: mealTypes.find((type) =>
            suggestion.meal.toLowerCase().includes(type.toLowerCase())
          ) || mealTypes[index],
          food_name: suggestion.suggestion,
        }));
      if (meals.length) {
        await saveRecommendedMeals(date, meals);
        const savedMeals = await getRecommendedMeals(date);
        setRecommendedMeals(savedMeals.meals || []);
      }
    } catch (requestError) {
      if (requestError.status === 401) {
        navigate("/login", { replace: true });
      } else {
        setCoachError(requestError.message);
      }
    } finally {
      setCoachLoading(false);
    }
  }

  const nutritionTotals = nutritionMetrics.map((metric) => ({
    ...metric,
    value: Number(nutrition?.[metric.key]) || 0,
  }));
  const activities = Array.isArray(dailyActivity?.activities)
    ? dailyActivity.activities
    : [];
  const recommendations = coach?.recommendations;
  const loggedSteps = activityEntries.some((entry) => entry.steps != null)
    ? activityEntries.reduce((total, entry) => total + Number(entry.steps || 0), 0)
    : wellness?.steps == null ? null : Number(wellness.steps);
  const activeMinutes = activityEntries.length
    ? activityEntries.reduce((total, entry) => total + Number(entry.active_minutes || 0), 0)
    : null;
  const waterTotalMl = water?.entries?.length ? Number(water.total_ml) : null;
  const waterGoalMl = Number(profile.hydration_goal_ml) || 2000;
  const currentRecovery = recovery?.current;
  const progressSummary = analysis?.summary;
  const stepsGoal = Number(profile.steps_goal) || 8000;
  const trendData = (analysis?.history || []).map((entry) => ({
    ...entry,
    date: new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
    }),
  }));
  const scheduledFor = (key) =>
    schedules.find((item) => item.habit_key === key)?.enabled || false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <Sidebar weeklyConsistency={consistency?.weekly_percentage ?? null} />

        <main className="min-w-0 flex-1 space-y-5">
          <section className="rounded-[32px] border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Overview</p>
            <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-400">
              Your logged activity and wellness check-in for {date}.
            </p>
          </section>

          {loading && <p role="status" className="text-sm text-slate-400">Loading your saved tracking data…</p>}
          {error && <p role="alert" className="rounded-xl bg-rose-950 p-3 text-sm text-rose-200">{error}</p>}
          {message && <p role="status" className="rounded-xl bg-emerald-950 p-3 text-sm text-emerald-200">{message}</p>}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Steps" value={loggedSteps == null ? "—" : loggedSteps.toLocaleString()} unit="steps" accent="cyan" />
            <StatCard title="Workout" value={activities.length ? Number(dailyActivity.workout_minutes) || 0 : "—"} unit="min" accent="violet" />
            <StatCard title="Water" value={waterTotalMl == null ? "—" : (waterTotalMl / 1000).toFixed(2)} unit="L" accent="emerald" />
            <StatCard title="Sleep" value={sleep ? (Number(sleep.duration_minutes) / 60).toFixed(1) : wellness?.sleep_hours != null ? Number(wellness.sleep_hours).toFixed(1) : "—"} unit="hrs" accent="amber" />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Hydration · {waterTotalMl == null ? "No entries recorded" : `${waterTotalMl} / ${waterGoalMl} ml`}</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Water intake</h2>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={waterTotalMl || 0} aria-valuemin="0" aria-valuemax={waterGoalMl} aria-label="Daily water intake">
                <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${Math.min(100, ((waterTotalMl || 0) / waterGoalMl) * 100)}%` }} />
              </div>
              <form onSubmit={handleWaterSubmit} className="mt-4 flex gap-3">
                <label className="sr-only" htmlFor="water-amount">Water amount in millilitres</label>
                <input id="water-amount" type="number" min="1" max="20000" step="1" required value={waterAmount} onChange={(event) => setWaterAmount(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                <button disabled={savingTracking} className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60">Add ml</button>
              </form>
              <ul className="mt-4 space-y-2">
                {(water?.entries || []).map((entry) => (
                  <li key={entry.water_entry_id} className="flex items-center justify-between rounded-lg bg-slate-950/70 px-3 py-2 text-sm">
                    <span>{entry.amount_ml} ml · {new Date(entry.created_at).toLocaleTimeString()}</span>
                    <button type="button" onClick={() => handleRemoveWater(entry.water_entry_id)} className="text-rose-300">Remove</button>
                  </li>
                ))}
              </ul>
            </div>
            <WorkoutCard onSubmit={handleWorkoutSubmit} saving={savingWorkout} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <form onSubmit={handleActivitySubmit} className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Manual activity</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Daily movement</h2>
              <p className="mt-2 text-sm text-slate-400">Record only tracked activity. Blank step counts remain unknown.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-slate-300">Activity type
                  <input required maxLength={80} value={activityForm.activity_type} onChange={(event) => setActivityForm({ ...activityForm, activity_type: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">Steps
                  <input type="number" min="0" max="100000" step="1" value={activityForm.steps} onChange={(event) => setActivityForm({ ...activityForm, steps: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">Distance (metres)
                  <input type="number" min="0" max="1000000" step="any" value={activityForm.distance_m} onChange={(event) => setActivityForm({ ...activityForm, distance_m: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">Active minutes
                  <input type="number" min="0" max="1440" step="1" value={activityForm.active_minutes} onChange={(event) => setActivityForm({ ...activityForm, active_minutes: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
              </div>
              <button disabled={savingTracking} className="mt-4 rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60">Save activity</button>
              <p className="mt-3 text-sm text-slate-400">{loggedSteps == null ? "Steps not recorded." : `${loggedSteps.toLocaleString()} / ${stepsGoal.toLocaleString()} steps`}{activeMinutes == null ? "" : ` · ${activeMinutes} active minutes`}</p>
              {loggedSteps != null && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={loggedSteps} aria-valuemin="0" aria-valuemax={stepsGoal} aria-label="Daily step goal progress">
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, (loggedSteps / stepsGoal) * 100)}%` }} />
                </div>
              )}
              <ul className="mt-3 space-y-2">
                {activityEntries.map((entry) => (
                  <li key={entry.activity_entry_id} className="flex items-center justify-between rounded-lg bg-slate-950/70 px-3 py-2 text-sm">
                    <span>{entry.activity_type} · {entry.steps == null ? "steps not recorded" : `${entry.steps} steps`}{entry.distance_m == null ? "" : ` · ${entry.distance_m} m`} · {entry.active_minutes} min ({entry.data_source})</span>
                    <button type="button" onClick={() => handleRemoveActivity(entry.activity_entry_id)} className="ml-2 text-rose-300">Remove</button>
                  </li>
                ))}
              </ul>
            </form>

            <form onSubmit={handleSleepSubmit} className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-violet-300">Sleep and self-report</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Sleep log</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-slate-300">Hours slept
                  <input required type="number" min="0.1" max="24" step="0.1" value={sleepForm.duration_hours} onChange={(event) => setSleepForm({ ...sleepForm, duration_hours: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
                {[
                  ["sleep_quality", "Sleep quality (1–5)"],
                  ["fatigue_rating", "Fatigue (1–5)"],
                  ["soreness_rating", "Muscle soreness (1–5)"],
                ].map(([key, label]) => (
                  <label key={key} className="text-sm text-slate-300">{label}
                    <select value={sleepForm[key]} onChange={(event) => setSleepForm({ ...sleepForm, [key]: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                      <option value="">Not recorded</option>
                      {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <button disabled={savingTracking} className="mt-4 rounded-xl bg-violet-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60">{sleep ? "Update sleep record" : "Save sleep record"}</button>
              {sleep && <p className="mt-3 text-sm text-slate-400">Recorded {(Number(sleep.duration_minutes) / 60).toFixed(1)} hours.</p>}
            </form>
          </section>

          <details className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
            <summary className="cursor-pointer text-lg font-semibold text-white">Goals, preferences, and schedule</summary>
          <section className="mt-5 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
            <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Preferences and goals</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Tracking settings</h2>
              <form onSubmit={handleProfileSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-slate-300">Height (cm) for BMI
                  <input type="number" min="80" max="250" step="0.1" value={profile.height_cm} onChange={(event) => setProfile({ ...profile, height_cm: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">Hydration goal (ml)
                  <input required type="number" min="250" max="10000" step="1" value={profile.hydration_goal_ml} onChange={(event) => setProfile({ ...profile, hydration_goal_ml: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">Daily step goal
                  <input required type="number" min="500" max="100000" step="1" value={profile.steps_goal} onChange={(event) => setProfile({ ...profile, steps_goal: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">Diet preference
                  <input value={profile.profile_preferences?.diet_preference || ""} onChange={(event) => setProfile({ ...profile, profile_preferences: { ...profile.profile_preferences, diet_preference: event.target.value } })} placeholder="e.g. vegetarian" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">Allergies
                  <input value={profile.profile_preferences?.allergies || ""} onChange={(event) => setProfile({ ...profile, profile_preferences: { ...profile.profile_preferences, allergies: event.target.value } })} placeholder="List allergies if any" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">Equipment / home or gym
                  <input value={profile.profile_preferences?.equipment || ""} onChange={(event) => setProfile({ ...profile, profile_preferences: { ...profile.profile_preferences, equipment: event.target.value } })} placeholder="e.g. home, dumbbells" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <button disabled={savingTracking} className="sm:col-span-2 rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60">Save settings</button>
              </form>
              <Link to="/progress" className="mt-4 inline-block text-sm text-cyan-200 hover:text-cyan-100">
                View weight and BMI progress →
              </Link>
            </div>

            <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Interactive schedule</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Consistency habits</h2>
              <p className="mt-2 text-sm text-slate-400">Only scheduled habits with recorded outcomes count. Unlogged meals and activities stay unknown; rest days are not scheduled workouts.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {habitOptions.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-lg bg-slate-950/70 p-3 text-sm text-slate-200">
                    <input type="checkbox" checked={scheduledFor(key)} onChange={(event) => toggleScheduledHabit(key, event.target.checked)} className="accent-emerald-400" />
                    {label}
                  </label>
                ))}
              </div>
              <fieldset className="mt-4 rounded-lg bg-slate-950/70 p-3">
                <legend className="px-1 text-sm text-slate-300">Scheduled workout days · rest days excluded</legend>
                <div className="mt-2 flex flex-wrap gap-3">
                  {weekdayOptions.map(([day, label]) => (
                    <label key={day} className="flex items-center gap-1 text-xs text-slate-300">
                      <input type="checkbox" checked={workoutWeekdays.includes(day)} onChange={(event) => toggleWorkoutDay(day, event.target.checked)} className="accent-emerald-400" />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-400">Today</p>
                  <p className="mt-1 text-2xl font-bold text-white">{consistency?.daily?.percentage == null ? "—" : `${consistency.daily.percentage}%`}</p>
                </div>
                <div className="rounded-xl bg-slate-950 p-4">
                  <p className="text-xs text-slate-400">Last 7 eligible days</p>
                  <p className="mt-1 text-2xl font-bold text-white">{consistency?.weekly_percentage == null ? "—" : `${consistency.weekly_percentage}%`}</p>
                </div>
              </div>
              {consistency?.formula && <p className="mt-3 text-xs text-slate-400">{consistency.formula}</p>}
            </div>
          </section>
          </details>

          <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Meal plan check-ins</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Recommended meals</h2>
              </div>
              <Link to="/diet" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-cyan-200 hover:bg-slate-800">Replace with USDA food</Link>
            </div>
            <p className="mt-2 text-sm text-slate-400">A check-in records your confirmation only. Nutrition totals include actual foods logged through the USDA food workflow.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {recommendedMeals.map((meal) => (
                <article key={meal.recommended_meal_id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wider text-cyan-300">{meal.meal_type}</p>
                  <p className="mt-2 text-sm text-white">{meal.food_name}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {meal.status === "completed" ? `Completed${meal.completed_at ? ` at ${new Date(meal.completed_at).toLocaleTimeString()}` : ""}` : meal.status === "skipped" ? "Explicitly skipped" : "Not checked in"}
                    {meal.food_log_id ? " · USDA food logged" : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleMealStatus(meal, meal.status === "completed" ? "planned" : "completed")} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950">
                      {meal.status === "completed" ? "Undo" : "Mark completed"}
                    </button>
                    <button type="button" onClick={() => handleMealStatus(meal, meal.status === "skipped" ? "planned" : "skipped")} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">
                      {meal.status === "skipped" ? "Undo skipped" : "Mark skipped"}
                    </button>
                  </div>
                </article>
              ))}
              {!recommendedMeals.length && (
                <p className="text-sm text-slate-400">No recommendations saved for today. Generate coach guidance below.</p>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Today's intake</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Nutrition summary</h2>
              </div>
              <Link to="/diet" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-cyan-200 hover:bg-slate-800">
                Open Diet
              </Link>
            </div>
            {loading ? (
              <p className="mt-4 text-sm text-slate-400">Loading today's data...</p>
            ) : (
              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                {nutritionTotals.map(({ key, label, unit, value }) => (
                  <div key={key} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                    <dt className="text-xs text-slate-400">{label}</dt>
                    <dd className="mt-1 font-semibold text-white">{Number(value.toFixed(1))} {unit}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <details className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
          <summary className="cursor-pointer text-lg font-semibold text-white">Progress history, recovery, and coach insights</summary>
          <div className="mt-5 space-y-6">
          <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
            <ProgressChart data={progressData} heightCm={profile.height_cm} />
            <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Today's log</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Workouts</h2>
              {activities.length ? (
                <ul className="mt-4 space-y-3">
                  {activities.map((activity, index) => (
                    <li key={`${activity.exercise}-${index}`} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                      <p className="font-semibold text-white">{activity.exercise}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {activity.durationMinutes} min · {activity.completed ? "Completed" : "Not completed"}
                        {activity.caloriesBurned !== null ? ` · ${activity.caloriesBurned} kcal` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-400">No workout records for today.</p>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Historical trends · 14 days</p>
            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              <WellnessTrendChart title="Steps" data={trendData} dataKey="steps" color="#22d3ee" unit="steps" />
              <WellnessTrendChart title="Sleep duration" data={trendData} dataKey="sleepHours" color="#a78bfa" unit="hours" />
              <WellnessTrendChart title="Recovery indicator" data={trendData} dataKey="recoveryScore" color="#34d399" unit="/100" />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <ActivityCard
              activity={{
                steps: loggedSteps,
                water_liters: waterTotalMl == null ? null : waterTotalMl / 1000,
                sleep_hours: sleep
                  ? Number(sleep.duration_minutes) / 60
                  : wellness?.sleep_hours == null ? null : Number(wellness.sleep_hours),
                workout_minutes: activities.length
                  ? Number(dailyActivity.workout_minutes)
                  : null,
              }}
            />
            <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-violet-300">Backend-calculated wellness indicator</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Recovery</h2>
              <p className="mt-2 text-4xl font-bold text-emerald-300">
                {currentRecovery?.score == null ? "—" : `${currentRecovery.score}/100`}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                {currentRecovery?.explanation || "Log sleep, self-reported recovery, or workout history to calculate an indicator. Missing inputs are not estimated."}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                {(currentRecovery?.factors || []).map((factor) => (
                  <li key={factor.key}>{factor.label}: {Math.round(factor.score)}/100 · {factor.detail}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">Wellness information, not a medical assessment.</p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-amber-300">Week over week</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Progress comparisons</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Steps", progressSummary?.comparisons?.currentWeekSteps, progressSummary?.comparisons?.previousWeekSteps, ""],
                  ["Water", progressSummary?.comparisons?.currentWeekWaterMl, progressSummary?.comparisons?.previousWeekWaterMl, " ml"],
                  ["Workouts", progressSummary?.comparisons?.currentWeekWorkouts, progressSummary?.comparisons?.previousWeekWorkouts, ""],
                  ["Sleep avg", progressSummary?.comparisons?.currentWeekAverageSleepHours, progressSummary?.comparisons?.previousWeekAverageSleepHours, " hrs"],
                  ["Consistency", progressSummary?.comparisons?.currentWeekConsistency, progressSummary?.comparisons?.previousWeekConsistency, "%"],
                ].map(([label, current, previous, unit]) => (
                  <div key={label} className="rounded-xl bg-slate-950 p-3">
                    <dt className="text-slate-400">{label}</dt>
                    <dd className="mt-1 font-semibold text-white">{current == null ? "No data" : `${current}${unit}`}</dd>
                    <dd className="text-xs text-slate-500">Previous week: {previous == null ? "No data" : `${previous}${unit}`}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-violet-300">STHIRA coach</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Adaptive recommendations</h2>
              <button type="button" onClick={handleCoachRequest} disabled={coachLoading} className="mt-5 rounded-xl border border-violet-400/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/20 disabled:opacity-60">
                {coachLoading ? "Asking your coach..." : "Get coach suggestions"}
              </button>
              {coachError && <p role="alert" className="mt-3 text-sm text-rose-300">{coachError}</p>}
              {recommendations && (
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <p className="text-xs text-slate-500">Powered by {coach.source}</p>
                  {recommendations.activityRecommendations.slice(0, 2).map((item) => (
                    <p key={item.name}><span className="font-semibold text-white">{item.name}</span> · {item.durationMinutes} min — {item.reason}</p>
                  ))}
                  {recommendations.mealSuggestions.slice(0, 2).map((item, index) => (
                    <p key={`${item.meal}-${index}`}><span className="font-semibold text-white">{item.meal}:</span> {item.suggestion}</p>
                  ))}
                  {(recommendations.progressInsights || []).map((item, index) => (
                    <p key={`${item.type}-${index}`} className={item.type === "positive" ? "text-emerald-200" : "text-slate-300"}>
                      {item.message}
                    </p>
                  ))}
                  <p>{recommendations.safetyNotes}</p>
                </div>
              )}
            </div>
          </section>
          </div>
          </details>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
