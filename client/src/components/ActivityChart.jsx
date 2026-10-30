import React from "react";

function ActivityCard({ activity }) {
  const metrics = [
    { label: "Steps", value: activity.steps == null ? "—" : Number(activity.steps).toLocaleString(), tone: "cyan" },
    { label: "Water", value: activity.water_liters == null ? "—" : `${Number(activity.water_liters).toFixed(2)} L`, tone: "blue" },
    { label: "Sleep", value: activity.sleep_hours == null ? "—" : `${Number(activity.sleep_hours).toFixed(1)} hrs`, tone: "violet" },
    { label: "Workout", value: activity.workout_minutes == null ? "—" : `${Number(activity.workout_minutes).toLocaleString()} min`, tone: "emerald" },
  ];

  const toneMap = {
    cyan: "bg-cyan-500/15 text-cyan-200",
    blue: "bg-blue-500/15 text-blue-200",
    violet: "bg-violet-500/15 text-violet-200",
    emerald: "bg-emerald-500/15 text-emerald-200",
  };

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Summary</p>
          <h3 className="mt-2 text-2xl font-bold text-white">Today’s Activity</h3>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-300">
          {Number(activity.workout_minutes) > 0 ? "Workout recorded" : "Workout not recorded"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.label} className={`rounded-2xl border border-slate-700 p-4 ${toneMap[metric.tone]}`}>
            <p className="text-xs uppercase tracking-[0.2em] opacity-75">{metric.label}</p>
            <p className="mt-3 text-2xl font-bold text-white">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActivityCard;