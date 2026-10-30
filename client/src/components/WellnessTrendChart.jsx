import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function WellnessTrendChart({ title, data, dataKey, color, unit }) {
  const recorded = data.filter((entry) => entry[dataKey] !== null && entry[dataKey] !== undefined);
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      {recorded.length ? (
        <div className="mt-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="#334155" strokeDasharray="4 4" />
              <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} width={48} />
              <Tooltip
                formatter={(value) => [`${value} ${unit}`, title]}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 12,
                  color: "#e2e8f0",
                }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">No records yet.</p>
      )}
    </section>
  );
}

export default WellnessTrendChart;
