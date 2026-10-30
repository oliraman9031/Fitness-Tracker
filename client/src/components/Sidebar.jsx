import React from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/workout", label: "Workout" },
  { to: "/diet", label: "Diet" },
  { to: "/activity", label: "Activity" },
  { to: "/progress", label: "Progress" },
];

function Sidebar({ weeklyConsistency }) {
  const location = useLocation();

  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-24 rounded-[28px] border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/30">
        <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Focus</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Performance Mode</h2>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const active = location.pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white ring-1 ring-cyan-400/40"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <span>{item.label}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-cyan-400" : "bg-slate-600"}`} />
              </Link>
            );
          })}
        </nav>

        {weeklyConsistency !== undefined && (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Goals</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {weeklyConsistency == null ? "—" : `${weeklyConsistency}%`}
            </p>
            <p className="mt-2 text-sm text-slate-300">Consistency this week</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;