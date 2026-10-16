import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-[28px] border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Welcome back</p>
        <h1 className="mt-4 text-3xl font-bold text-white">Login</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="sr-only" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            placeholder="Email"
            required
          />
          <label className="sr-only" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            placeholder="Password"
            required
          />
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-center font-semibold text-slate-950 disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Continue"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-300">
          New here? <Link to="/register" className="text-cyan-300">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
