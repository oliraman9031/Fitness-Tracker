
import React, { useState } from "react";
import { getRecommendations } from "../services/foodApi";

export default function AICoachCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");

    try {
      const today = new Date();
      const date = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");

      const result = await getRecommendations({
        date,
        available_time_minutes: 20,
        fitness_goal: "general fitness",
        preferred_activities: ["walking", "mobility"],
        diet_preference: "no preference",
      });

      setData(result.recommendations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-violet-500/20 bg-slate-900/80 p-6">
      <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
        STHIRA AI
      </p>

      <h2 className="mt-3 text-2xl font-bold">Your Fitness Coach</h2>

      <p className="mt-2 text-slate-400">
        Get an activity suggestion and balanced meal ideas based on your
        logged nutrition and exercise.
      </p>

      <button
        onClick={generate}
        disabled={loading}
        className="mt-5 rounded-xl bg-gradient-to-r from-violet-400 to-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate today's guidance"}
      </button>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>
      )}

      {data && (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-slate-300">{data.explanation}</p>

          {(data.activityRecommendations || []).map((item, index) => (
            <div key={`${item.name}-${index}`} className="rounded-xl bg-slate-950 p-4">
              <h3 className="font-semibold">{item.name}</h3>
              <p className="mt-1 text-sm text-cyan-300">
                {item.durationMinutes} minutes
              </p>
              <p className="mt-2 text-sm text-slate-400">{item.reason}</p>
            </div>
          ))}

          <h3 className="font-semibold">Meal ideas</h3>

          {(data.mealSuggestions || []).map((meal, index) => (
            <p key={`${meal.meal}-${index}`} className="text-sm text-slate-300">
              <span className="font-medium text-emerald-300">
                {meal.meal}:
              </span>{" "}
              {meal.suggestion}
            </p>
          ))}

          <p className="text-xs text-slate-500">{data.safetyNotes}</p>
        </div>
      )}
    </section>
  );
}
