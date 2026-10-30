import React, { useState } from "react";

function WorkoutCard({ onSubmit, saving }) {
  const [exerciseName, setExerciseName] = useState("");
  const [duration, setDuration] = useState("30");
  const [calories, setCalories] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const saved = await onSubmit({
      exercise_name: exerciseName,
      duration_minutes: Number(duration),
      calories_burned: Number(calories),
    });
    if (saved) {
      setExerciseName("");
      setDuration("30");
      setCalories("");
    }
  }

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Workout log</p>
      <h3 className="mt-3 text-2xl font-bold text-white">Record a workout</h3>
      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <label className="block text-sm text-slate-300">
          Exercise
          <input required maxLength={150} value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} placeholder="e.g. Bench Press" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-slate-300">
            Minutes
            <input required type="number" min="1" max="1440" step="1" value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </label>
          <label className="block text-sm text-slate-300">
            Calories burned
            <input required type="number" min="0" max="999999.99" step="any" value={calories} onChange={(event) => setCalories(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </label>
        </div>
        <button type="submit" disabled={saving} className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? "Saving..." : "Save workout"}
        </button>
      </form>
    </div>
  );
}

export default WorkoutCard;