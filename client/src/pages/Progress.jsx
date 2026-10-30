import React, { useEffect, useState } from "react";
import Navbar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import ProgressChart from "../components/PorgressChart";
import { getProgress, saveProgress } from "../services/foodApi";

function Progress() {
  const [weight, setWeight] = useState("");
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadProgress() {
    setError("");
    try {
      const records = await getProgress();
      setProgressData(
        (Array.isArray(records) ? records : []).map((item) => ({
          date: new Date(item.recorded_date).toLocaleDateString(),
          weight: Number(item.weight),
        }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProgress();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const numericWeight = Number(weight);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      setError("Enter a valid positive weight.");
      return;
    }

    setSaving(true);
    try {
      await saveProgress(numericWeight);
      setWeight("");
      setMessage("Progress recorded.");
      await loadProgress();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="rounded-[32px] border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">
              Milestones
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white">Progress</h1>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap gap-3">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="Enter weight"
                className="min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Record"}
              </button>
            </form>

            {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
            {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}
            {loading ? (
              <p className="mt-6 text-slate-400">Loading progress...</p>
            ) : (
              <div className="mt-8">
                <ProgressChart data={progressData} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Progress;
