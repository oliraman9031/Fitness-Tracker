import React from "react";

function StatCard({ title, value, unit, accent = "cyan" }) {
  const accentMap = {
    cyan: "from-cyan-500/20 to-sky-500/5 text-cyan-200",
    violet: "from-violet-500/20 to-fuchsia-500/5 text-violet-200",
    emerald: "from-emerald-500/20 to-teal-500/5 text-emerald-200",
    amber: "from-amber-500/20 to-orange-500/5 text-amber-200",
  };

  return (
    <div className={`rounded-[28px] border border-slate-800 bg-gradient-to-br ${accentMap[accent]} p-5 shadow-xl shadow-slate-950/20`}>
      <div className="flex items-center justify-between text-slate-300">
        <span className="text-sm font-medium">{title}</span>
        <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">Today</span>
      </div>
      <p className="mt-6 text-3xl font-bold text-white">
        {value}
        <span className="ml-2 text-base font-medium text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

export default StatCard;