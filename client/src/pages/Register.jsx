import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      await register(formData.name, formData.email, formData.password);
      navigate("/dashboard");
    } catch (requestError) {
      setMessage(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">

      <div className="w-full max-w-md rounded-[28px] border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">

        <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">
          Start strong
        </p>

        <h1 className="mt-4 text-3xl font-bold text-white">
          Create account
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            placeholder="Full name"
            autoComplete="name"
            maxLength={100}
            required
          />

          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            placeholder="Email"
            autoComplete="email"
            maxLength={254}
            required
          />

          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            placeholder="Password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-3 text-center font-semibold text-slate-950"
          >
            {submitting ? "Creating account..." : "Sign up"}
          </button>

        </form>

        {message && (
          <p role="alert" className="mt-4 text-center text-sm text-cyan-300">
            {message}
          </p>
        )}

        <p className="mt-3 text-center text-xs text-slate-400">
          Use a password with at least 12 characters.
        </p>

        <p className="mt-5 text-center text-sm text-slate-300">
          Already have an account?{" "}
          <Link to="/login" className="text-cyan-300">
            Login
          </Link>
        </p>

      </div>

    </div>
  );
}

export default Register;