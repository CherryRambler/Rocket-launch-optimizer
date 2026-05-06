import { useMemo, useState } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import { Tooltip } from "react-tooltip";
import { addDays, format, parseISO } from "date-fns";
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
  { label: "0-35", color: "#7f1d1d" },
  { label: "35-50", color: "#92400e" },
  { label: "50-65", color: "#78350f" },
  { label: "65-80", color: "#14532d" },
  { label: "80-100", color: "#00e676" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function HeatmapCalendar({ data, topWindows, compact = false }) {
  const [selected, setSelected] = useState(null);
  const days = useMemo(() => dayBuckets(data), [data]);
  
  // Always show exactly 21 days starting from the first available date
  const days21 = useMemo(() => {
    if (!days.length) return [];
    return days.slice(0, 21);
  }, [days]);

  const topDays = useMemo(() => new Set(topWindows.slice(0, 3).map((w) => w.timestamp.slice(0, 10))), [topWindows]);

  if (!days21.length) return null;
  const startDate = parseISO(days21[0].date);
  const endDate = addDays(startDate, 20);

  const paddedDays = useMemo(() => {
    const firstWeekday = parseISO(days21[0].date).getDay();
    return [...Array(firstWeekday).fill(null), ...days21];
  }, [days21]);

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-legend">
        <span className="heatmap-legend-label">Launch Readiness</span>
        {LEGEND.map((l) => (
          <div key={l.label} className="heatmap-legend-chip">
            <span className="heatmap-legend-dot" style={{ background: l.color }} />
            <span className="mono heatmap-legend-text">{l.label}</span>
          </div>
        ))}
        <span className="heatmap-top-note">Top 3 windows are highlighted</span>
      </div>

      <div className="heatmap-canvas">
        {compact ? (
          <div className="heatmap-mini-calendar">
            {WEEKDAYS.map((d) => (
              <span key={d} className="heatmap-weekday">{d}</span>
            ))}
            {paddedDays.map((v, idx) =>
              v ? (
                <button
                  key={v.date}
                  type="button"
                  className={`heatmap-day-cell ${cls(v.score)} ${topDays.has(v.date) ? "heatmap-day-top" : ""}`}
                  data-tooltip-id="hm-tip"
                  data-tooltip-content={JSON.stringify(v)}
                  onClick={() => setSelected(v)}
                >
                  <span className="heatmap-day-month">{format(parseISO(v.date), "MMM")}</span>
                  <span className="heatmap-day-num">{v.date.slice(8, 10)}</span>
                </button>
              ) : (
                <div key={`pad-${idx}`} className="heatmap-day-empty" />
              )
            )}
          </div>
        ) : (
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={days21}
            gutterSize={3}
            classForValue={(v) => (v ? cls(v.score) : "color-empty")}
            tooltipDataAttrs={(v) =>
              v?.date
                ? {
                    "data-tooltip-id": "hm-tip",
                    "data-tooltip-content": JSON.stringify(v),
                  }
                : {}
            }
            onClick={(v) => v && setSelected(v)}
            showWeekdayLabels
          />
        )}
      </div>

      <Tooltip
        id="hm-tip"
        render={({ content }) => {
          try {
            const v = JSON.parse(content);
            const isTop = topDays.has(v.date);
            return (
              <div className="mono" style={{ padding: "10px 14px", minWidth: 200, background: "rgba(10,14,26,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 6 }}>
                  <span style={{ color: "var(--text)", fontWeight: 700 }}>{format(parseISO(v.date), "MMMM do, yyyy")}</span>
                  {isTop && <span className="orbit-chip" style={{ fontSize: 9 }}>TOP WINDOW</span>}
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>Peak Score</p>
                    <p style={{ fontSize: 16, color: "var(--cyan)", fontWeight: 700 }}>{v.score?.toFixed(1)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>Risk Level</p>
                    <p style={{ fontSize: 13, color: v.launch_risk_level === "GO" ? "#00ff88" : "#ffc107", fontWeight: 600 }}>{v.launch_risk_level}</p>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>Orbital Alignment</span>
                    <span>{v.score_orbital?.toFixed(0)}%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>Δv Efficiency</span>
                    <span>{v.score_delta_v?.toFixed(0)}%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>Weather Score</span>
                    <span>{v.score_weather?.toFixed(0)}%</span>
                  </div>
                </div>

                <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 11 }}>
                  <p><span style={{ color: "var(--text-muted)" }}>Wind:</span> {v.wind_speed_ms?.toFixed(1)} m/s</p>
                  <p><span style={{ color: "var(--text-muted)" }}>Clouds:</span> {v.cloud_cover_pct?.toFixed(0)}%</p>
                </div>
              </div>
            );
          } catch {
            return null;
          }
        }}
      />

      {selected && compact && (
        <div className="heatmap-selected-compact mono">
          <span>{selected.date}</span>
          <span className="heatmap-selected-score">{selected.score?.toFixed(1)}</span>
          <span>O {selected.score_orbital?.toFixed(0)}</span>
          <span>Dv {selected.score_delta_v?.toFixed(0)}</span>
          <span>Wx {selected.score_weather?.toFixed(0)}</span>
        </div>
      )}

      {selected && !compact && (
        <div
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            padding: "8px 12px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 6,
          }}
        >
          {selected.date} — Best score:{" "}
          <span style={{ color: "var(--text)", fontWeight: 700 }}>{selected.score?.toFixed(1)}</span>
          {" · "}Orbital: {selected.score_orbital?.toFixed(1)}
          {" · "}Dv: {selected.score_delta_v?.toFixed(1)}
          {" · "}Weather: {selected.score_weather?.toFixed(1)}
          {topDays.has(selected.date) && <span style={{ color: "var(--cyan)", marginLeft: 8 }}>Top window day</span>}
        </div>
      )}
    </div>
  );
}
