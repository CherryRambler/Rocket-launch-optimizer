import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, GitCompare, History, Bell } from "lucide-react";

import { useApp }        from "./context/AppContext";
import { calculateWindows, fetchChartData, fetchOrbitPreview } from "./api";

import StarfieldBackground from "./components/StarfieldBackground";
import Dashboard           from "./components/Dashboard";
import MissionComparison   from "./components/MissionComparison";
import HistoricalReplay    from "./components/HistoricalReplay";
import AlertSystem         from "./components/AlertSystem";

const TABS = [
  { id: "dashboard",  label: "Dashboard",  Icon: LayoutDashboard },
  { id: "compare",    label: "Compare",    Icon: GitCompare       },
  { id: "historical", label: "Historical", Icon: History          },
  { id: "alerts",     label: "Alerts",     Icon: Bell             },
];

// ── Kinetic typography — each character pulses font-weight in a wave ──────────
const TITLE = "Launch Optimizer";

function KineticTitle() {
  return (
    <span className="kinetic-title" aria-label={TITLE}>
      {TITLE.split("").map((ch, i) => (
        <motion.span
          key={i}
          style={{ display: "inline-block", whiteSpace: "pre" }}
          animate={{ fontWeight: [300, 800, 300] }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            delay: i * 0.09,
            ease: "easeInOut",
          }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const {
    setWindows, setChartData, setOrbitData, setLoading,
    pushFeed, clearFeed, setError, setSelectedWindow, alerts,
  } = useApp();

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
        pushFeed({
          pct: 100,
          msg: `Complete — ${result.total_slots_analyzed.toLocaleString()} slots analysed, ${result.windows.length} windows ranked.`,
        });
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
    <div className="app-root">
      <StarfieldBackground />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="app-header">
          <div className="header-inner">

            {/* Brand */}
            <div className="brand">
              <div className="brand-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#050816" strokeWidth="2.5">
                  <path d="M12 2L12 5M12 2C12 2 7 6 7 12C7 15 8.5 17.5 10 19L12 21L14 19C15.5 17.5 17 15 17 12C17 6 12 2 12 2Z"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <div>
                <p className="brand-name">
                  <KineticTitle />
                </p>
                <p className="brand-sub mono">SDSC SHAR · Sriharikota</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="header-nav">
              {TABS.map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`nav-tab ${active ? "nav-tab--active" : ""}`}
                  >
                    <Icon size={13} />
                    {label}
                    {id === "alerts" && alerts.length > 0 && (
                      <span className="alert-badge">{alerts.length}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Live indicator */}
            <div className="live-indicator">
              <span className="pulse-dot" />
              <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>LIVE</span>
            </div>
          </div>
        </header>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <main className="app-main">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <FadePanel key="dashboard">
                <Dashboard onCalculate={handleCalculate} />
              </FadePanel>
            )}
            {activeTab === "compare" && (
              <FadePanel key="compare"><MissionComparison /></FadePanel>
            )}
            {activeTab === "historical" && (
              <FadePanel key="historical"><HistoricalReplay /></FadePanel>
            )}
            {activeTab === "alerts" && (
              <FadePanel key="alerts"><AlertSystem /></FadePanel>
            )}
          </AnimatePresence>
        </main>

        <footer className="app-footer">
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
