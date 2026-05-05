import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

const TOP_WINDOW_COLOR = "#ff6b35";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-3 text-xs font-mono border-slate-600 shadow-xl">
      <p className="text-slate-300 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(1)}
        </p>
      ))}
    </div>
  );
}

export default function ScoreChart({ data, topWindows }) {
  // Sample data for performance: show every Nth point to keep chart fast
  const SAMPLE = Math.max(1, Math.floor(data.length / 500));
  const sampled = data.filter((_, i) => i % SAMPLE === 0);

  // Timestamps of top windows for reference lines
  const topTimestamps = new Set(topWindows.slice(0, 3).map((w) => w.timestamp));

  const formatted = sampled.map((d) => ({
    ...d,
    time: format(parseISO(d.timestamp), "dd MMM HH:mm"),
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#1a73e8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradOrbital" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradWeather" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            interval={Math.floor(formatted.length / 8)}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}
          />

          {/* Reference lines for top 3 windows */}
          {topWindows.slice(0, 3).map((w, i) => (
            <ReferenceLine
              key={w.rank}
              x={format(parseISO(w.timestamp), "dd MMM HH:mm")}
              stroke={i === 0 ? TOP_WINDOW_COLOR : "#64748b"}
              strokeDasharray={i === 0 ? "0" : "4 4"}
              label={{ value: `#${w.rank}`, fill: i === 0 ? TOP_WINDOW_COLOR : "#64748b", fontSize: 9 }}
            />
          ))}

          <Area
            type="monotone"
            dataKey="score"
            name="Total Score"
            stroke="#1a73e8"
            strokeWidth={2}
            fill="url(#gradTotal)"
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Area
            type="monotone"
            dataKey="score_orbital"
            name="Orbital Alignment"
            stroke="#34d399"
            strokeWidth={1}
            fill="url(#gradOrbital)"
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Area
            type="monotone"
            dataKey="score_weather"
            name="Weather"
            stroke="#fbbf24"
            strokeWidth={1}
            fill="url(#gradWeather)"
            dot={false}
            activeDot={{ r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 text-right font-mono mt-1">
        Orange lines = top 3 windows · All times IST
      </p>
    </div>
  );
}
