import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/foodApi";

function Navbar() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then(({ user }) => setUserName(user.name))
      .catch(() => setUserName(""));
  }, []);

  async function handleLogout() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Unable to log out:", error);
    }
  }

  return (
    <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-lg font-black text-slate-950 shadow-glow">
            S
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Wellness</p>
            <h1 className="text-xl font-bold text-white">STHIRA</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-300 md:flex">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
            Ready for today
          </div>
          <div className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 font-semibold text-slate-950">
              R
            </div>
            <span className="font-medium">{userName || "Account"}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-cyan-400/50 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;