
import React, { useEffect, useState } from "react";
import Navbar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import {
  getWorkouts,
  getRecommendations,
  saveWorkout,
  saveMealPlan,
} from "../services/foodApi";

const USER_ID = 1; // Prototype only.

function localDate() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function Workout() {
  const [workouts, setWorkouts] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [preferences, setPreferences] = useState({
    available_time_minutes: 20,
    fitness_goal: "general fitness",
    preferred_activities: ["walking", "mobility"],
    diet_preference: "no preference",
  });

  const [workout, setWorkout] = useState({
    exercise_name: "",
    duration_minutes: "20",
    calories_burned: "",
    notes: "",
    completed: true,
  });

  async function loadWorkouts() {
    try {
      const data = await getWorkouts(USER_ID);
      setWorkouts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadWorkouts();
  }, []);

  async function requestRecommendations() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await getRecommendations({
        user_id: USER_ID,
        ...preferences,
        date: localDate(),
      });

      setRecommendations(result);
      setMessage("Recommendations generated.");
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleWorkoutSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const completed = workout.completed;
      const result = await saveWorkout({
        user_id: USER_ID,
        ...workout,
        duration_minutes: Number(workout.duration_minutes),
        calories_burned:
          workout.calories_burned === ""
            ? null
            : Number(workout.calories_burned),
      });

      setMessage(result.message || "Workout saved.");
      setWorkout({
        exercise_name: "",
        duration_minutes: "20",
        calories_burned: "",
        notes: "",
        completed: true,
      });

      await loadWorkouts();
      if (!completed) {
        const guidanceRefreshed = await requestRecommendations();
        setMessage(
          guidanceRefreshed
            ? "Activity updated. Your coach has refreshed the upcoming meal guidance."
            : "Activity saved, but the coach could not refresh meal guidance."
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePlan() {
    if (!recommendations?.recommendations?.threeDayMealPlan?.length) {
      setError("Generate a three-day meal plan first.");
      return;
    }

    try {
      await saveMealPlan(
        USER_ID,
        localDate(),
        recommendations.recommendations
      );
      setMessage("Three-day meal plan saved.");
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  const coach = recommendations?.recommendations;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <Sidebar />

        <main className="min-w-0 flex-1 space-y-6">
          <header>
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">
              Activity & AI
            </p>
            <h1 className="mt-3 text-3xl font-bold">Workout & AI Coach</h1>
            <p className="mt-2 text-slate-400">
              Get activity suggestions, log completed exercise and review
              balanced meal ideas. Report your actual calorie estimate; the
              coach does not set a burn target to offset food.
            </p>
          </header>

          {error && (
            <p role="alert" className="rounded-xl bg-red-950 p-3 text-red-200">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-xl bg-emerald-950 p-3 text-emerald-200">
              {message}
            </p>
          )}

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">Your preferences</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-400">
                  Available time (minutes)
                </span>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={preferences.available_time_minutes}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      available_time_minutes: Number(event.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-400">Fitness goal</span>
                <select
                  value={preferences.fitness_goal}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      fitness_goal: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                >
                  <option value="general fitness">General fitness</option>
                  <option value="strength">Strength</option>
                  <option value="mobility">Mobility</option>
                  <option value="cardiovascular health">Cardiovascular health</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-400">Diet preference</span>
                <select
                  value={preferences.diet_preference}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      diet_preference: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                >
                  <option value="no preference">No preference</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="eggetarian">Eggetarian</option>
                </select>
              </label>

              <div className="space-y-2">
                <span className="text-sm text-slate-400">
                  Preferred activities
                </span>
                <div className="flex flex-wrap gap-3">
                  {["walking", "cycling", "mobility", "strength training"].map(
                    (activity) => (
                      <label
                        key={activity}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={preferences.preferred_activities.includes(
                            activity
                          )}
                          onChange={(event) => {
                            const current =
                              preferences.preferred_activities;

                            setPreferences({
                              ...preferences,
                              preferred_activities: event.target.checked
                                ? [...current, activity]
                                : current.filter((a) => a !== activity),
                            });
                          }}
                          className="accent-cyan-400"
                        />
                        {activity}
                      </label>
                    )
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={requestRecommendations}
              disabled={loading}
              className="mt-5 rounded-xl bg-gradient-to-r from-violet-400 to-cyan-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate AI recommendations"}
            </button>
          </section>

          {coach && (
            <section className="rounded-3xl border border-cyan-900 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold">Your recommendations</h2>

              <p className="mt-1 text-xs text-slate-400">
                {recommendations.source === "ollama"
                  ? "AI-generated locally from today's confirmed food and activity logs; no API credits used."
                  : recommendations.source === "openai"
                    ? "AI-generated from today's confirmed food and activity logs."
                    : "General rules-based guidance, not generative AI."}
              </p>

              <p className="mt-2 text-slate-300">{coach.explanation}</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {(coach.activityRecommendations || []).map((item, index) => (
                  <article
                    key={`${item.name}-${index}`}
                    className="rounded-2xl border border-slate-700 bg-slate-950 p-4"
                  >
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="mt-2 text-cyan-300">
                      {item.durationMinutes} minutes
                    </p>
                    <p className="mt-2 text-sm text-slate-400">{item.reason}</p>

                    <button
                      type="button"
                      onClick={() => {
                        setWorkout({
                          ...workout,
                          exercise_name: item.name,
                          duration_minutes: String(item.durationMinutes || 20),
                          completed: true,
                        });
                        document
                          .getElementById("workout-log")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="mt-4 rounded-lg bg-slate-800 px-3 py-2 text-sm"
                    >
                      Log this activity
                    </button>
                  </article>
                ))}
              </div>

              <h3 className="mt-6 font-semibold">Meal suggestions</h3>
              <div className="mt-3 space-y-3">
                {(coach.mealSuggestions || []).map((item, index) => (
                  <div
                    key={`${item.meal}-${index}`}
                    className="rounded-xl bg-slate-950 p-4"
                  >
                    <p className="font-medium">{item.meal}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {item.suggestion}
                    </p>
                  </div>
                ))}
              </div>

              {!!coach.threeDayMealPlan?.length && (
                <>
                  <h3 className="mt-6 font-semibold">Three-day meal plan</h3>
                  <div className="mt-3 space-y-3">
                    {coach.threeDayMealPlan.map((day) => (
                      <div
                        key={day.day}
                        className="rounded-xl bg-slate-950 p-4"
                      >
                        <h4 className="font-medium">Day {day.day}</h4>
                        {(day.meals || []).map((meal, index) => (
                          <p
                            key={`${meal.meal}-${index}`}
                            className="mt-2 text-sm text-slate-300"
                          >
                            <span className="text-cyan-300">{meal.meal}:</span>{" "}
                            {meal.suggestion}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleSavePlan}
                    className="mt-4 rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950"
                  >
                    Save three-day plan
                  </button>
                </>
              )}

              <p className="mt-4 text-sm text-slate-400">{coach.safetyNotes}</p>
            </section>
          )}

          <section
            id="workout-log"
            className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
          >
            <h2 className="text-xl font-semibold">Log an activity</h2>

            <form onSubmit={handleWorkoutSubmit} className="mt-4 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-slate-400">Exercise name</span>
                <input
                  value={workout.exercise_name}
                  onChange={(event) =>
                    setWorkout({
                      ...workout,
                      exercise_name: event.target.value,
                    })
                  }
                  required
                  placeholder="e.g. Brisk walk"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-400">
                    Duration (minutes)
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    required
                    value={workout.duration_minutes}
                    onChange={(event) =>
                      setWorkout({
                        ...workout,
                        duration_minutes: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-400">
                    Calories burned (kcal, from your device or estimate)
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="999999.99"
                    step="any"
                    value={workout.calories_burned}
                    required
                    onChange={(event) =>
                      setWorkout({
                        ...workout,
                        calories_burned: event.target.value,
                      })
                    }
                    placeholder={
                      workout.completed
                        ? "Enter your device's estimate"
                        : "Enter your estimate, or 0 if you did none"
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={workout.completed}
                  onChange={(event) =>
                    setWorkout({
                      ...workout,
                      completed: event.target.checked,
                    })
                  }
                  className="h-5 w-5 accent-emerald-400"
                />
                I completed this activity
              </label>
              {!workout.completed && (
                <p className="text-sm text-slate-400">
                  Record any calories you did burn, or enter 0 if you did none.
                  Your coach will use this update to refresh balanced meal
                  suggestions; there is no exercise calorie target to make up.
                </p>
              )}

              <label className="block space-y-2">
                <span className="text-sm text-slate-400">Notes (optional)</span>
                <textarea
                  value={workout.notes}
                  onChange={(event) =>
                    setWorkout({ ...workout, notes: event.target.value })
                  }
                  placeholder="How did the activity feel?"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
                />
              </label>

              <button
                disabled={saving}
                className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save activity"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">Workout history</h2>

            <div className="mt-4 space-y-3">
              {workouts.map((item) => (
                <article
                  key={item.workout_id}
                  className="rounded-xl border border-slate-800 p-4"
                >
                  <h3 className="font-medium">{item.exercise_name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {item.duration_minutes} min
                    {item.calories_burned !== null
                      ? ` · ${item.calories_burned} kcal reported`
                      : " · Calories not entered"}
                    {!item.completed && " · Not completed"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </article>
              ))}

              {!workouts.length && (
                <p className="text-slate-400">No workouts logged yet.</p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
