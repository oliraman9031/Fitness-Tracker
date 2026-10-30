import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import { getActivities, getRecovery } from "../services/foodApi";

function localDate() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function sumRecorded(entries, key) {
  const values = entries
    .map((entry) => entry[key])
    .filter((value) => value !== null && value !== undefined)
    .map(Number)
    .filter(Number.isFinite);

  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}

export default function Activity() {
  const [date, setDate] = useState(localDate);
  const [activities, setActivities] = useState([]);
  const [recovery, setRecovery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    Promise.all([getActivities(date), getRecovery(date, 14)])
      .then(([activityData, recoveryData]) => {
        if (!active) return;
        setActivities(activityData.entries || []);
        setRecovery(recoveryData.current || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date]);

  const stats = useMemo(() => {
    const steps = sumRecorded(activities, "steps");
    const distance = sumRecorded(activities, "distance_m");
    const activeMinutes = sumRecorded(activities, "active_minutes");

    return [
      { label: "Daily steps", value: steps === null ? "Not recorded" : steps.toLocaleString() },
      {
        label: "Walking distance",
        value: distance === null ? "Not recorded" : `${(distance / 1000).toFixed(2)} km`,
      },
      {
        label: "Active minutes",
        value: activeMinutes === null ? "Not recorded" : `${activeMinutes} min`,
      },
      {
        label: "Recovery indicator",
        value: recovery?.score == null ? "Not enough data" : `${recovery.score}/100`,
      },
    ];
  }, [activities, recovery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="rounded-[32px] border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-xs uppercase tracking-[0.32em] text-violet-300">Movement</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">Activity</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Review recorded movement and recovery. Unlogged activity is not assumed to be zero.
                </p>
              </div>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Activity date</span>
                <input
                  type="date"
                  value={date}
                  max={localDate()}
                  onChange={(event) => setDate(event.target.value)}
                  className="block rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-5 rounded-xl bg-red-950 p-3 text-red-200">
                {error}
              </p>
            )}

            {loading ? (
              <p className="mt-6 text-slate-400">Loading recorded activity…</p>
            ) : (
              <>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {stats.map((item) => (
                    <div key={item.label} className="rounded-[24px] border border-slate-700 bg-slate-950/70 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                      <p className="mt-3 text-2xl font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <section className="mt-8">
                  <h2 className="text-xl font-semibold text-white">Movement entries</h2>
                  {activities.length ? (
                    <ul className="mt-4 space-y-3">
                      {activities.map((entry) => (
                        <li
                          key={entry.activity_entry_id}
                          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                        >
                          <div className="flex flex-wrap justify-between gap-2">
                            <h3 className="font-medium text-white">{entry.activity_type}</h3>
                            <span className="text-xs text-slate-400">
                              {entry.data_source === "connected_device" ? "Connected device" : "Manual entry"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-300">
                            {entry.steps == null ? "Steps not recorded" : `${Number(entry.steps).toLocaleString()} steps`}
                            {" · "}
                            {entry.distance_m == null ? "Distance not recorded" : `${(Number(entry.distance_m) / 1000).toFixed(2)} km`}
                            {" · "}
                            {Number(entry.active_minutes)} active min
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">
                      No activity entries are recorded for this date.
                    </p>
                  )}
                  {recovery?.explanation && (
                    <p className="mt-5 text-sm text-slate-400">
                      Recovery is a wellness indicator, not a medical assessment. {recovery.explanation}
                    </p>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
