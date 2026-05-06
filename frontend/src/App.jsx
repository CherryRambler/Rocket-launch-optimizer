import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, GitCompare, History, Bell, Rocket } from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";

import { useApp }        from "./context/AppContext";
import { calculateWindows, fetchChartData, fetchOrbitPreview } from "./api";

import LandingPage         from "./components/LandingPage";
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
const HEATMAP_DAYS = 21;

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

function MissionClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = time.getUTCHours().toString().padStart(2, "0");
  const m = time.getUTCMinutes().toString().padStart(2, "0");
  const s = time.getUTCSeconds().toString().padStart(2, "0");
  return <span className="mono" style={{ fontSize: 13, color: "var(--cyan)", fontWeight: 700 }}>T+{h}:{m}:{s}</span>;
}

export default function App() {
  const [onLanding, setOnLanding] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const {
    setWindows, setChartData, setOrbitData, setLoading,
    pushFeed, clearFeed, setError, setSelectedWindow,
    setChartMeta, setChartExpanding, alerts,
  } = useApp();

  const handleCalculate = useCallback(async (values) => {
    setLoading(true);
    setError(null);
    clearFeed();
    setWindows([]);

    const steps = [
      { pct: 15, msg: `Fetching live weather data for ${values.launch_site_name || "launch site"}...` },
      { pct: 35, msg: `Computing orbital alignment for ${values.orbit_type}...` },
      { pct: 55, msg: `Calculating delta-V for ${values.payload_mass_kg} kg payload...` },
      { pct: 80, msg: "Scoring all candidate windows at 10-minute intervals..." },
      { pct: 95, msg: "Ranking and filtering top windows..." },
    ];
    steps.forEach((s, i) => setTimeout(() => pushFeed(s), i * 400));

    try {
      // Phase 1 — fast: original date range + orbit preview (shown immediately)
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
        setChartMeta({ userStart: values.start_date, userEnd: values.end_date });
        setOrbitData(orbit);
        setSelectedWindow(result.best_window);
        setLoading(false);

        // Phase 2 — background: fixed 21-day context for stable heatmap performance
        setChartExpanding(true);
        const heatmapStart = subDays(parseISO(values.start_date), 7);
        const expanded = {
          ...values,
          start_date: format(heatmapStart, "yyyy-MM-dd"),
          end_date: format(addDays(heatmapStart, HEATMAP_DAYS - 1), "yyyy-MM-dd"),
        };
        fetchChartData(expanded)
          .then(r => { setChartData(r.data); setChartExpanding(false); })
          .catch(() => setChartExpanding(false));
      }, steps.length * 400 + 200);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Request failed";
      setError(msg);
      pushFeed({ pct: 0, msg: `Error: ${msg}` });
      setLoading(false);
    }
  }, [setLoading, setError, clearFeed, pushFeed, setWindows,
      setChartData, setChartMeta, setChartExpanding, setOrbitData, setSelectedWindow]);

  return (
    <div className="universal-container">
      {/* ── Universal Modern Navbar ────────────────────────────────────────── */}
      <header style={{ 
        position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
        zIndex: 1000, width: "100%", maxWidth: 1400, padding: "0 24px",
        pointerEvents: "none"
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(10,15,30,0.65)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: "10px 14px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,212,255,0.03)",
          pointerEvents: "all"
        }}>
          {/* Brand Module */}
          <div 
            onClick={() => setOnLanding(true)} 
            style={{ 
              cursor: "pointer", display: "flex", alignItems: "center", gap: 12, 
              padding: "6px 16px", borderRadius: 16, background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.3s ease"
            }}
            className="navbar-brand-pill"
          >
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#00d4ff,#b388ff)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 15px rgba(0,212,255,0.3)" }}>
              <Rocket size={16} color="#050816" />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>
                ROCKET<span style={{ color: "var(--cyan)" }}>OPT</span>
              </span>
              <span className="mono" style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}>MISSION_OPS</span>
            </div>
          </div>

          {/* Nav Links with Sliding Indicator */}
          <nav style={{ position: "relative", display: "flex", alignItems: "center", gap: 4 }}>
            {!onLanding && (
              <>
                {TABS.map(({ id, label, Icon }) => {
                  const active = activeTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      style={{
                        position: "relative", zIndex: 2, border: "none", background: "transparent",
                        padding: "8px 18px", borderRadius: 12, display: "flex", alignItems: "center", gap: 8,
                        color: active ? "var(--text)" : "rgba(255,255,255,0.5)",
                        fontSize: 13, fontWeight: active ? 700 : 500, transition: "color 0.3s ease",
                        cursor: "pointer"
                      }}
                    >
                      <Icon size={14} color={active ? "var(--cyan)" : "currentColor"} />
                      {label}
                      {id === "alerts" && alerts.length > 0 && (
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--red)", marginLeft: 2 }} />
                      )}
                      
                      {active && (
                        <motion.div
                          layoutId="nav-pill"
                          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                          style={{
                            position: "absolute", inset: 0, zIndex: -1,
                            background: "rgba(255,255,255,0.06)", borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.05)"
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </nav>

          {/* Status Module */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, paddingRight: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" }}>
                <p className="mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", margin: 0 }}>MET_CLOCK</p>
                <MissionClock />
              </div>
              <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)" }}>
                <div className="pulse-dot" style={{ width: 4, height: 4 }} />
                <span className="mono" style={{ fontSize: 10, color: "#00ff88", fontWeight: 700 }}>LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {onLanding ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <LandingPage onEnter={() => setOnLanding(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="app-root">
              <video autoPlay loop muted playsInline style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", objectFit: "cover", zIndex: 0, pointerEvents: "none" }}>
                <source src="/hero.mp4" type="video/mp4" />
              </video>
              <div style={{ position: "fixed", inset: 0, background: "rgba(6,10,20,0.52)", zIndex: 0, pointerEvents: "none" }} />
              <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(0,212,255,0.05) 0%, transparent 70%)", zIndex: 0, pointerEvents: "none" }} />
              <div style={{ position: "fixed", inset: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 4px)", zIndex: 0, pointerEvents: "none" }} />

              <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", paddingTop: 80 }}>
                {/* Content */}
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
          </motion.div>
        )}
      </AnimatePresence>
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
