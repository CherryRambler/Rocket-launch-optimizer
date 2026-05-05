import { lazy, Suspense } from "react";
import { useApp } from "../context/AppContext";
import LiquidGlassCard from "./LiquidGlassCard";
import InputForm       from "./InputForm";
import WeatherRadar    from "./WeatherRadar";
import HeatmapCalendar from "./HeatmapCalendar";
import ResultCards     from "./ResultCards";
import CountdownTimer  from "./CountdownTimer";
import CalculationFeed from "./CalculationFeed";
import WhatIfSimulator from "./WhatIfSimulator";
import ExportButton    from "./ExportButton";

// Dynamic import — code-splits the heavy Three.js bundle
const EarthScene = lazy(() => import("./EarthScene"));

export default function Dashboard({ onCalculate }) {
  const { windows, loading, feedLines, error, chartData,
          selectedWindow, formValues } = useApp();
  const hasResults = windows.length > 0;
  const orbitType  = formValues?.orbit_type ?? "LEO";

  return (
    <div className="bento-grid">

      {/* ── Mission Config ─── col 1-4, row 1 ─────────────────────────── */}
      <LiquidGlassCard style={{ gridColumn: "1 / 5" }} className="bento-pad">
        <p className="section-label">Mission Configuration</p>
        <InputForm onSubmit={onCalculate} />
      </LiquidGlassCard>

      {/* ── Earth 3D ────────── col 5-13, rows 1-2 ────────────────────── */}
      <LiquidGlassCard
        accent
        style={{ gridColumn: "5 / 13", gridRow: "1 / 3", padding: 0, overflow: "hidden", minHeight: 380 }}
      >
        <div className="earth-label">
          <p className="section-label" style={{ margin: 0 }}>3D Orbit View</p>
          <span className="orbit-chip">{orbitType}</span>
        </div>
        <div style={{ height: "calc(100% - 36px)" }}>
          <Suspense fallback={<EarthFallback />}>
            <EarthScene selectedWindow={selectedWindow} orbitType={orbitType} />
          </Suspense>
        </div>
      </LiquidGlassCard>

      {/* ── Weather ──────────── col 1-4, row 2 ───────────────────────── */}
      <LiquidGlassCard style={{ gridColumn: "1 / 5" }} className="bento-pad">
        <p className="section-label">Weather — Sriharikota</p>
        <WeatherRadar />
      </LiquidGlassCard>

      {/* ── Calculation Feed ─── col 1-13, row 3 (conditional) ────────── */}
      {(loading || feedLines.length > 0) && (
        <LiquidGlassCard style={{ gridColumn: "1 / 13" }} className="bento-pad">
          <CalculationFeed lines={feedLines} loading={loading} error={error} />
        </LiquidGlassCard>
      )}

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {hasResults && (
        <>
          {/* Countdown row */}
          <LiquidGlassCard
            accent
            style={{ gridColumn: "1 / 9" }}
            className="bento-pad bento-flex-between"
          >
            <div>
              <p className="section-label" style={{ marginBottom: 8 }}>Next optimal window</p>
              <CountdownTimer windows={windows} />
            </div>
            <ExportButton />
          </LiquidGlassCard>

          {/* Stats mini-cards */}
          <LiquidGlassCard style={{ gridColumn: "9 / 13" }} className="bento-pad bento-stats-grid">
            <StatCard label="Slots"      value={new Intl.NumberFormat().format(windows.length * 50)} />
            <StatCard label="Best score" value={windows[0]?.score_total.toFixed(1)} accent />
            <StatCard label="Orbit"      value={orbitType} />
            <StatCard label="Risk"       value={windows[0]?.launch_risk_level ?? "—"} />
          </LiquidGlassCard>

          {/* What-If + Windows */}
          <LiquidGlassCard style={{ gridColumn: "1 / 4" }} className="bento-pad">
            <p className="section-label">What-If Simulator</p>
            <WhatIfSimulator onRecalculate={onCalculate} />
          </LiquidGlassCard>

          <LiquidGlassCard style={{ gridColumn: "4 / 13" }} className="bento-pad">
            <p className="section-label">Launch Windows — Top {windows.length}</p>
            <ResultCards windows={windows} />
          </LiquidGlassCard>

          {/* Heatmap */}
          {chartData.length > 0 && (
            <LiquidGlassCard style={{ gridColumn: "1 / 13" }} className="bento-pad">
              <p className="section-label">Score Heatmap — All Candidate Slots</p>
              <HeatmapCalendar data={chartData} topWindows={windows} />
            </LiquidGlassCard>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className={`stat-value mono ${accent ? "stat-accent" : ""}`}>{value ?? "—"}</p>
    </div>
  );
}

function EarthFallback() {
  return (
    <div style={{
      height: "100%", display: "flex", alignItems: "center",
      justifyContent: "center", flexDirection: "column", gap: 12,
    }}>
      <div className="earth-spinner" />
      <p className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>Loading 3D scene…</p>
    </div>
  );
}
