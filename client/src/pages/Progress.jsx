import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/NavBar";
import Sidebar from "../components/Sidebar";
import ProgressChart from "../components/PorgressChart";
import {
  getProgress,
  getProgressAnalysis,
  getWellnessProfile,
  saveProgress,
} from "../services/foodApi";

function formatProgress(entries) {
  return entries.map((item) => ({
    date: new Date(item.recorded_date).toLocaleDateString(),
    weight: Number(item.weight),
  }));
}

function Progress() {
  const navigate = useNavigate();
  const [weight, setWeight] = useState("");
  const [progressData, setProgressData] = useState([]);
  const [heightCm, setHeightCm] = useState("");
  const [bmi, setBmi] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getProgress(), getWellnessProfile(), getProgressAnalysis()])
      .then(([data, profile, analysis]) => {
        setProgressData(formatProgress(data));
        setHeightCm(profile.profile.height_cm ?? "");
        setBmi(analysis.summary.bmi);
      })
      .catch((loadError) => {
        if (loadError.status === 401) {
          navigate("/login", { replace: true });
        } else {
          setError(loadError.message);
        }
      });
  }, [navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveProgress(weight);
      const [progress, analysis] = await Promise.all([
        getProgress(),
        getProgressAnalysis(),
      ]);
      setProgressData(formatProgress(progress));
      setBmi(analysis.summary.bmi);
      setWeight("");
      setMessage("Weight entry saved.");
    } catch (saveError) {
      if (saveError.status === 401) {
        navigate("/login", { replace: true });
      } else {
        setError(saveError.message);
      }
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
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Milestones</p>
            <h1 className="mt-3 text-3xl font-bold text-white">Progress</h1>
            <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap gap-3">
              <label className="sr-only" htmlFor="weight-entry">Today's weight</label>
              <input
                id="weight-entry"
                type="number"
                min="0.1"
                max="9999.99"
                step="0.1"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="Enter today's weight"
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Record Weight"}
              </button>
            </form>
            {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
            {message && <p role="status" className="mt-4 text-sm text-emerald-300">{message}</p>}
            <section className="mt-6 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-violet-200">BMI · wellness screening measure</p>
              <p className="mt-2 text-3xl font-bold text-white">{bmi ? bmi.value : "—"}</p>
              <p className="mt-1 text-sm text-violet-100">
                {bmi ? bmi.category : "Record your weight and add your height in dashboard tracking settings."}
              </p>
              {bmi?.note && <p className="mt-2 text-xs text-slate-300">{bmi.note}</p>}
            </section>
            <div className="mt-8">
              <ProgressChart data={progressData} heightCm={heightCm} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Progress;
