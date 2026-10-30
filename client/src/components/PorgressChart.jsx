import React from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function ProgressChart({ data, heightCm }) {
  const height = Number(heightCm) / 100;
  const chartData = data.map((entry) => ({
    ...entry,
    bmi: height > 0 ? Number((Number(entry.weight) / (height * height)).toFixed(1)) : null,
  }));
  const change = data.length > 1
    ? Number(data[data.length - 1].weight) - Number(data[0].weight)
    : null;

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Performance</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Weight and BMI Progress</h2>
        </div>
        {change !== null && (
          <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200">
            {change > 0 ? "+" : ""}{change.toFixed(1)} kg
          </span>
        )}
      </div>

      <div className="h-72 w-full">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
            <CartesianGrid stroke="#334155" strokeDasharray="4 4" />
            <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis yAxisId="weight" stroke="#94a3b8" tickLine={false} axisLine={false} />
            {height > 0 && <YAxis yAxisId="bmi" orientation="right" stroke="#a78bfa" tickLine={false} axisLine={false} />}
            <Legend />
            <Tooltip
              formatter={(value, name) => [
                name === "Weight" ? `${value} kg` : value,
                name === "Weight" ? "Weight" : "BMI",
              ]}
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 16,
                color: "#e2e8f0",
              }}
            />
            <Line yAxisId="weight" name="Weight" type="monotone" dataKey="weight" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: "#22d3ee" }} />
            {height > 0 && <Line yAxisId="bmi" name="BMI" type="monotone" dataKey="bmi" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3, fill: "#a78bfa" }} />}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No weight entries yet. Add one on the Progress page. Add your height to include BMI history.
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgressChart;