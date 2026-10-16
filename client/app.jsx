import React from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Dashboard from "./src/pages/Dashboard";
import Workout from "./src/pages/Workout";
import Diet from "./src/pages/Diet";
import Activity from "./src/pages/Activity";
import Progress from "./src/pages/Progress";
import Login from "./src/pages/Login";
import Register from "./src/pages/Register";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";

function RequireAuth({ children }) {
  const { user, loading, error } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-950" aria-label="Loading" />;
  }
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p role="alert">{`Unable to verify your session: ${error}`}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen bg-slate-950" aria-label="Loading" />;
  }
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/workout" element={<RequireAuth><Workout /></RequireAuth>} />
          <Route path="/diet" element={<RequireAuth><Diet /></RequireAuth>} />
          <Route path="/activity" element={<RequireAuth><Activity /></RequireAuth>} />
          <Route path="/progress" element={<RequireAuth><Progress /></RequireAuth>} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;