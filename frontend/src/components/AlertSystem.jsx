import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, Trash2, AlertTriangle, CheckCircle, Info, ShieldAlert } from "lucide-react";
import { useApp } from "../context/AppContext";
import { fetchWeather } from "../api";
import LiquidGlassCard from "./LiquidGlassCard";

const SCRUB_THRESHOLD = 50;
const POLL_MS = 30 * 60 * 1000;

const IST = { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" };

function requestPerm() {
  if (!("Notification" in window)) return Promise.resolve("denied");
  if (Notification.permission === "granted") return Promise.resolve("granted");
  return Notification.requestPermission();
}

function notify(title, body) {
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/rocket.svg" });
}

export default function AlertSystem() {
  const { alerts, removeAlert } = useApp();
  const pollRef = useRef(null);

  const checkAlerts = useCallback(async () => {
    for (const a of alerts) {
      try {
        const dt = new Date(a.timestamp);
        const s  = new Date(dt - 3 * 3600000).toISOString();
        const e  = new Date(dt + 3 * 3600000).toISOString();
        const d  = await fetchWeather(s, e);
        if (d.current.weather_score < SCRUB_THRESHOLD) {
          notify(
            "Launch window at scrub risk",
            `${new Date(a.timestamp).toLocaleString("en-IN", IST)} — weather score ${d.current.weather_score.toFixed(0)}/100`
          );
        }
      } catch { /* silent */ }
    }
  }, [alerts]);

  useEffect(() => {
    pollRef.current = setInterval(checkAlerts, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [checkAlerts]);

  const granted   = typeof Notification !== "undefined" && Notification.permission === "granted";
  const supported = "Notification" in window;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>

      {/* Page title */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <h2 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "var(--text)", margin: 0, letterSpacing: "-0.03em" }}>Scrub Sentinel</h2>
        <p style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 12, lineHeight: 1.6, maxWidth: 600, margin: "12px auto 0" }}>
          Automated weather monitoring for saved mission profiles. Our system polls live meteorological 
          data every 30 minutes to ensure launch window integrity.
        </p>
      </div>

      {/* Permission banner */}
      {supported && !granted && (
        <LiquidGlassCard style={{ padding: "24px 32px", border: "1px solid rgba(255,193,7,0.2)", background: "rgba(255,193,7,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32, width: "100%" }}>
            <div style={{ width: 44, height: 44, background: "rgba(255,193,7,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertTriangle size={22} color="#ffc107" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: 0 }}>System Notifications Disabled</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Enable alerts to receive real-time scrub warnings in your browser.</p>
            </div>
            <button 
              className="btn-primary" 
              onClick={() => requestPerm()} 
              style={{ 
                background: "#ffc107", color: "#000", border: "none", height: 42, padding: "0 20px",
                borderRadius: 10, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                flexShrink: 0
              }}
            >
              <Bell size={16} /> Enable Alerts
            </button>
          </div>
        </LiquidGlassCard>
      )}

      {granted && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: "rgba(0,242,255,0.04)", borderRadius: 12, border: "1px solid rgba(0,242,255,0.15)", width: "fit-content", margin: "0 auto" }}>
          <CheckCircle size={16} color="#00f2ff" />
          <span className="mono" style={{ fontSize: 12, color: "var(--cyan)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Sentinel Active · Polling Real-Time Weather</span>
        </div>
      )}

      {/* Alert list */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingLeft: 4 }}>
          <ShieldAlert size={20} color="var(--cyan)" />
          <p className="section-label" style={{ margin: 0, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active Monitoring ({alerts.length})</p>
        </div>

        {alerts.length === 0 ? (
          <LiquidGlassCard style={{ padding: "80px 40px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: 64, height: 64, background: "rgba(255,255,255,0.03)", borderRadius: "50%", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                <BellOff size={32} color="var(--text-dim)" />
              </div>
              <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: 0 }}>No active alerts</p>
              <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 10, maxWidth: 340, lineHeight: 1.6 }}>
                Launch windows saved from the dashboard will appear here for automated monitoring.
              </p>
            </div>
          </LiquidGlassCard>
        ) : (
          <AnimatePresence>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {alerts.map(a => (
                <motion.div key={a.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", damping: 25, stiffness: 120 }}
                >
                  <LiquidGlassCard style={{ padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, width: "100%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div style={{ width: 48, height: 48, background: "rgba(0,242,255,0.06)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(0,242,255,0.1)" }}>
                          <Bell size={20} color="var(--cyan)" />
                        </div>
                        <div>
                          <p className="mono" style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.01em" }}>
                            {new Date(a.timestamp).toLocaleString("en-IN", IST)}
                          </p>
                          <div style={{ display: "flex", gap: 14, marginTop: 8, alignItems: "center" }}>
                            <span className={`chip chip-${a.orbit_type}`} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4 }}>{a.orbit_type}</span>
                            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
                            <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              SCORE: <span style={{ color: "var(--text)", fontWeight: 700 }}>{a.score_total}%</span>
                            </span>
                            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
                            <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              WEATHER: <span style={{ color: "var(--text)", fontWeight: 700 }}>{a.score_weather?.toFixed(0)}%</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <button onClick={() => removeAlert(a.id)}
                        className="btn-icon-ghost" style={{ width: 44, height: 44, borderRadius: 12, color: "rgba(255,68,68,0.5)", transition: "all 0.2s ease", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                        title="Deactivate alert">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </LiquidGlassCard>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* How it works */}
      <LiquidGlassCard style={{ padding: 32, border: "1px solid rgba(0,212,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Info size={20} color="var(--cyan)" />
          <p className="section-label" style={{ margin: 0, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sentinel Protocol</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              "Save windows directly from the Dashboard telemetry.",
              "Window configuration and state persist in local storage.",
              "Sentinal polls live weather data every 30 minutes."
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cyan)", marginTop: 6, flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{s}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              `Alerts trigger if weather drops below ${SCRUB_THRESHOLD}%.`,
              "System level notifications fire even if tab is in background.",
              "Deactivate sentinel tracking anytime via the trash icon."
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cyan)", marginTop: 6, flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      </LiquidGlassCard>
    </div>
  );
}
