import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import WorkoutCard from "../components/WorkoutCard";
import ActivityCard from "../components/ActivityChart";
import ProgressChart from "../components/PorgressChart";
import { getDietLogs } from "../services/foodApi";

const nutritionMetrics = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
  { key: "sugar", label: "Sugar", unit: "g" },
  { key: "sodium", label: "Sodium", unit: "mg" },
];

function Dashboard() {
  const [dietLogs, setDietLogs] = useState([]);
  const [dietError, setDietError] = useState("");

  useEffect(() => {
    getDietLogs(1)
      .then(setDietLogs)
      .catch((error) => setDietError(error.message));
  }, []);

  const nutritionTotals = nutritionMetrics.map((metric) => ({
    ...metric,
    value: dietLogs.reduce((total, item) => total + (Number(item[metric.key]) || 0), 0),
  }));

  const exercise = {
    name: "Bench Press",
    muscle_group: "Chest",
    difficulty: "Beginner",
    sets: 3,
    reps: 10,
  };

  const activity = {
    steps: 7500,
    water: 2.2,
    sleep: 7.5,
    workout_minutes: 45,
  };

  const progressData = [
    { date: "Week 1", weight: 72 },
    { date: "Week 2", weight: 71.5 },
    { date: "Week 3", weight: 71 },
    { date: "Week 4", weight: 70.4 },
    { date: "Week 5", weight: 70 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <Sidebar />

        <main className="flex-1 space-y-8">
          <section className="rounded-[32px] border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Overview</p>
                <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">Dashboard</h1>
              </div>
              <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">
                7 day streak
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Steps" value="7,500" unit="steps" accent="cyan" />
            <StatCard title="Workout" value="45" unit="min" accent="violet" />
            <StatCard title="Water" value="2.2" unit="L" accent="emerald" />
            <StatCard title="Sleep" value="7.5" unit="hrs" accent="amber" />
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
            {dietError ? (
              <p role="alert" className="mt-4 text-sm text-rose-300">{dietError}</p>
            ) : (
              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                {nutritionTotals.map(({ key, label, unit, value }) => (
                  <div key={key} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                    <dt className="text-xs text-slate-400">{label}</dt>
                    <dd className="mt-1 font-semibold text-white">
                      {Number(value.toFixed(1))} {unit}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section className="grid gap-8 xl:grid-cols-[1.5fr_0.9fr]">
            <ProgressChart data={progressData} />
            <WorkoutCard exercise={exercise} />
          </section>

          <section className="grid gap-8 xl:grid-cols-[1fr_1.2fr]">
            <ActivityCard activity={activity} />
            <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Coach note</p>
              <h3 className="mt-3 text-2xl font-bold text-white">Recovery balance</h3>
              <p className="mt-4 text-slate-300">
                Your movement and hydration are trending well. Keep your protein intake steady and aim for one more recovery walk this evening.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-sm text-slate-300">
                    <span>Hydration</span>
                    <span>86%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-800">
                    <div className="h-2.5 w-[86%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm text-slate-300">
                    <span>Mobility</span>
                    <span>74%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-800">
                    <div className="h-2.5 w-[74%] rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-500" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;