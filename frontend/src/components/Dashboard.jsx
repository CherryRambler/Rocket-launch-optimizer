import { useApp } from "../context/AppContext";
import InputForm       from "./InputForm";
import CesiumGlobe     from "./CesiumGlobe";
import WeatherRadar    from "./WeatherRadar";
import HeatmapCalendar from "./HeatmapCalendar";
import ResultCards     from "./ResultCards";
import CountdownTimer  from "./CountdownTimer";
import CalculationFeed from "./CalculationFeed";
import WhatIfSimulator from "./WhatIfSimulator";
import ExportButton    from "./ExportButton";

export default function Dashboard({ onCalculate }) {
  const { windows, loading, feedLines, error, chartData } = useApp();
  const hasResults = windows.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Top row: Config / Weather / Globe ──────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 280px 1fr", gap: 16 }}>

        <div className="card" style={{ padding: "20px" }}>
          <p className="section-label">Mission Configuration</p>
          <InputForm onSubmit={onCalculate} />
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <p className="section-label">Weather — Sriharikota</p>
          <WeatherRadar />
        </div>

        <div className="card" style={{ padding: "16px", minHeight: 340 }}>
          <p className="section-label">3D Orbit View</p>
          <div style={{ height: 280 }}>
            <CesiumGlobe />
          </div>
        </div>
      </div>

      {/* ── Calculation feed ────────────────────────────────────────────── */}
      {(loading || feedLines.length > 0) && (
        <CalculationFeed lines={feedLines} loading={loading} error={error} />
      )}

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {hasResults && (
        <>
          {/* Countdown + summary row */}
          <div className="card" style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <p className="section-label" style={{ marginBottom: 8 }}>Next optimal window</p>
              <CountdownTimer windows={windows} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <Stat label="Slots analysed" value={windows[0] ? new Intl.NumberFormat().format(windows.length * 50) : "—"} />
              <Stat label="Best score"     value={windows[0]?.score_total.toFixed(1)} highlight />
              <Stat label="Orbit"          value={windows[0]?.orbit_type} />
              <ExportButton />
            </div>
          </div>

          {/* What-If + Windows table */}
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
            <div className="card" style={{ padding: "20px" }}>
              <p className="section-label">What-If Simulator</p>
              <WhatIfSimulator onRecalculate={onCalculate} />
            </div>
            <div className="card" style={{ padding: "20px" }}>
              <p className="section-label">Launch Windows — Top {windows.length}</p>
              <ResultCards windows={windows} />
            </div>
          </div>

          {/* Heatmap */}
          {chartData.length > 0 && (
            <div className="card" style={{ padding: "20px" }}>
              <p className="section-label">Score Heatmap — All Candidate Slots</p>
              <HeatmapCalendar data={chartData} topWindows={windows} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
        {label}
      </p>
      <p className="mono" style={{ fontSize: 18, fontWeight: 700, color: highlight ? "var(--cyan)" : "var(--text)" }}>
        {value ?? "—"}
      </p>
    </div>
  );
}
