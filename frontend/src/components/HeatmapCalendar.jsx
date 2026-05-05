import { useMemo, useState } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import { Tooltip } from "react-tooltip";
import { parseISO } from "date-fns";
import "react-calendar-heatmap/dist/styles.css";

function dayBuckets(data) {
  const map = {};
  for (const d of data) {
    const day = d.timestamp.slice(0, 10);
    if (!map[day] || d.score > map[day].score) map[day] = d;
  }
  return Object.entries(map).map(([date, d]) => ({ date, ...d }));
}

function cls(score) {
  if (score == null) return "color-empty";
  if (score >= 80) return "color-scale-5";
  if (score >= 65) return "color-scale-4";
  if (score >= 50) return "color-scale-3";
  if (score >= 35) return "color-scale-2";
  return "color-scale-1";
}

const LEGEND = [
  { label: "0–35",   color: "#7f1d1d" },
  { label: "35–50",  color: "#92400e" },
  { label: "50–65",  color: "#78350f" },
  { label: "65–80",  color: "#14532d" },
  { label: "80–100", color: "#00e676" },
];

export default function HeatmapCalendar({ data, topWindows }) {
  const [selected, setSelected] = useState(null);
  const days    = useMemo(() => dayBuckets(data), [data]);
  const topDays = useMemo(() => new Set(topWindows.slice(0, 3).map(w => w.timestamp.slice(0, 10))), [topWindows]);

  if (!days.length) return null;
  const startDate = parseISO(days[0].date);
  const endDate   = parseISO(days[days.length - 1].date);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Score range:</span>
        {LEGEND.map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />
            <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{l.label}</span>
          </div>
        ))}
        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
          Top 3 window days are highlighted
        </span>
      </div>

      {/* Heatmap */}
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <CalendarHeatmap
          startDate={startDate}
          endDate={endDate}
          values={days}
          classForValue={v => v ? cls(v.score) : "color-empty"}
          tooltipDataAttrs={v => v?.date ? {
            "data-tooltip-id": "hm-tip",
            "data-tooltip-content": JSON.stringify(v),
          } : {}}
          onClick={v => v && setSelected(v)}
          showWeekdayLabels
        />
      </div>

      <Tooltip
        id="hm-tip"
        render={({ content }) => {
          try {
            const v = JSON.parse(content);
            return (
              <div className="mono" style={{ fontSize: 11, padding: 4, lineHeight: 1.8 }}>
                <p style={{ color: "var(--cyan)", fontWeight: 700, marginBottom: 4 }}>
                  {v.date}{topDays.has(v.date) ? "  ·  Top window day" : ""}
                </p>
                <p>Total: <strong>{v.score?.toFixed(1)}</strong></p>
                <p>Orbital {v.score_orbital?.toFixed(1)} · Δv {v.score_delta_v?.toFixed(1)} · Weather {v.score_weather?.toFixed(1)}</p>
              </div>
            );
          } catch { return null; }
        }}
      />

      {selected && (
        <div className="mono" style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
          {selected.date} — Best score: <span style={{ color: "var(--text)", fontWeight: 700 }}>{selected.score?.toFixed(1)}</span>
          {" · "}Orbital: {selected.score_orbital?.toFixed(1)}
          {" · "}Δv: {selected.score_delta_v?.toFixed(1)}
          {" · "}Weather: {selected.score_weather?.toFixed(1)}
          {topDays.has(selected.date) && <span style={{ color: "var(--cyan)", marginLeft: 8 }}>Top window day</span>}
        </div>
      )}
    </div>
  );
}
