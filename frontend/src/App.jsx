import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { LayoutDashboard, GitCompare, History, Bell } from "lucide-react";

import { useApp } from "./context/AppContext";
import { calculateWindows, fetchChartData, fetchOrbitPreview } from "./api";

import Dashboard      from "./components/Dashboard";
import MissionComparison from "./components/MissionComparison";
import HistoricalReplay  from "./components/HistoricalReplay";
import AlertSystem       from "./components/AlertSystem";

const TABS = [
  { id: "dashboard",  label: "Dashboard",  Icon: LayoutDashboard },
  { id: "compare",    label: "Compare",    Icon: GitCompare       },
  { id: "historical", label: "Historical", Icon: History          },
  { id: "alerts",     label: "Alerts",     Icon: Bell             },
];

const PARTICLES_OPTIONS = {
  background: { color: { value: "transparent" } },
  fpsLimit: 30,
  particles: {
    color: { value: "#ffffff" },
    move: { enable: true, speed: 0.2, random: true, outModes: "out" },
    number: { value: 80, density: { enable: true } },
    opacity: { value: { min: 0.02, max: 0.25 } },
    size: { value: { min: 0.5, max: 1.5 } },
  },
  detectRetina: true,
};

export default function App() {
  const [activeTab, setActiveTab]         = useState("dashboard");
  const [particlesReady, setParticlesReady] = useState(false);
  const { setWindows, setChartData, setOrbitData, setLoading,
          pushFeed, clearFeed, setError, setSelectedWindow,
          alerts } = useApp();

  useEffect(() => {
    initParticlesEngine(async (e) => { await loadSlim(e); })
      .then(() => setParticlesReady(true));
  }, []);

  const handleCalculate = useCallback(async (values) => {
    setLoading(true);
    setError(null);
    clearFeed();
    setWindows([]);

    const steps = [
      { pct: 15, msg: "Fetching live weather data for Sriharikota..." },
      { pct: 35, msg: `Computing orbital alignment for ${values.orbit_type}...` },
      { pct: 55, msg: `Calculating delta-V for ${values.payload_mass_kg} kg payload...` },
      { pct: 80, msg: "Scoring all candidate windows at 10-minute intervals..." },
      { pct: 95, msg: "Ranking and filtering top windows..." },
    ];
    steps.forEach((s, i) => setTimeout(() => pushFeed(s), i * 400));

    try {
      const [result, chart, orbit] = await Promise.all([
        calculateWindows(values),
        fetchChartData(values),
        fetchOrbitPreview(values.orbit_type),
      ]);
      setTimeout(() => {
        pushFeed({ pct: 100, msg: `Complete — ${result.total_slots_analyzed.toLocaleString()} slots analysed, ${result.windows.length} windows ranked.` });
        setWindows(result.windows);
        setChartData(chart.data);
        setOrbitData(orbit);
        setSelectedWindow(result.best_window);
        setLoading(false);
      }, steps.length * 400 + 200);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Request failed";
      setError(msg);
      pushFeed({ pct: 0, msg: `Error: ${msg}` });
      setLoading(false);
    }
  }, [setLoading, setError, clearFeed, pushFeed, setWindows,
      setChartData, setOrbitData, setSelectedWindow]);

  return (
    <div className="relative min-h-screen" style={{ background: "var(--bg)" }}>
      {particlesReady && (
        <Particles id="stars" options={PARTICLES_OPTIONS}
          className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={{
          borderBottom: "1px solid var(--border)",
          background: "rgba(8,12,24,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}>
          <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}
            className="flex items-center gap-6 h-14">

            {/* Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <div style={{
                width: 28, height: 28,
                background: "linear-gradient(135deg, var(--cyan) 0%, #0066ff 100%)",
                borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080c18" strokeWidth="2.5">
                  <path d="M12 2L12 5M12 2C12 2 7 6 7 12C7 15 8.5 17.5 10 19L12 21L14 19C15.5 17.5 17 15 17 12C17 6 12 2 12 2Z"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>
                  Launch Optimizer
                </p>
                <p className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  SDSC SHAR · Sriharikota
                </p>
              </div>
            </div>

            {/* Nav tabs */}
            <nav className="flex items-center gap-1 ml-6">
              {TABS.map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className="flex items-center gap-2 relative"
                    style={{
                      padding: "6px 14px",
                      borderRadius: 7,
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active ? "var(--text)" : "var(--text-muted)",
                      background: active ? "rgba(255,255,255,0.06)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "color 0.15s, background 0.15s",
                    }}
                  >
                    <Icon size={14} />
                    {label}
                    {id === "alerts" && alerts.length > 0 && (
                      <span style={{
                        background: "var(--cyan)", color: "#080c18",
                        fontSize: 10, fontWeight: 700,
                        borderRadius: 10, padding: "0 5px", lineHeight: "16px",
                        minWidth: 16, textAlign: "center",
                      }}>
                        {alerts.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Live dot */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="pulse-dot" style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--green)", display: "inline-block",
              }} />
              <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                LIVE
              </span>
            </div>
          </div>
        </header>

        {/* ── Page content ────────────────────────────────────────────────── */}
        <main style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <FadePanel key="dashboard">
                <Dashboard onCalculate={handleCalculate} />
              </FadePanel>
            )}
            {activeTab === "compare" && (
              <FadePanel key="compare">
                <MissionComparison />
              </FadePanel>
            )}
            {activeTab === "historical" && (
              <FadePanel key="historical">
                <HistoricalReplay />
              </FadePanel>
            )}
            {activeTab === "alerts" && (
              <FadePanel key="alerts">
                <AlertSystem />
              </FadePanel>
            )}
          </AnimatePresence>
        </main>

        <footer style={{
          borderTop: "1px solid var(--border)",
          padding: "20px 24px",
          textAlign: "center",
        }}>
          <p className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
            Scoring weights: 40% Orbital Alignment · 40% Δv Efficiency · 20% Weather
            &nbsp;·&nbsp; Data: OpenWeatherMap + Skyfield
          </p>
        </footer>
      </div>
    </div>
  );
}

function FadePanel({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
