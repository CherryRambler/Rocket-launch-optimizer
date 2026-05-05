import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { fetchWeather } from "../api";

const SCRUB_THRESHOLD = 50;
const POLL_MS = 30 * 60 * 1000;

const IST = { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };

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
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Page title */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>Scrub Alerts</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
          Browser notifications fire automatically when weather deteriorates below a safe threshold for any saved window. The app polls every 30 minutes in the background.
        </p>
      </div>

      {/* Permission banner */}
      {supported && !granted && (
        <div className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderColor: "rgba(255,193,7,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={16} color="#ffc107" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>Notifications disabled</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Enable to receive scrub alerts</p>
            </div>
          </div>
          <button className="btn-ghost" onClick={() => requestPerm()}>
            <Bell size={13} /> Enable
          </button>
        </div>
      )}

      {granted && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--green)" }}>
          <CheckCircle size={14} />
          <span className="mono">Notifications active · polling every 30 min</span>
        </div>
      )}

      {/* Alert list */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p className="section-label" style={{ margin: 0 }}>Active alerts ({alerts.length})</p>
        </div>

        {alerts.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <BellOff size={28} color="var(--text-dim)" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>No active alerts</p>
            <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
              Click the bell icon on any launch window card to add one.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {alerts.map(a => (
              <motion.div key={a.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                className="card" style={{ padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Bell size={16} color="var(--cyan)" style={{ flexShrink: 0 }} />
                  <div>
                    <p className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                      {new Date(a.timestamp).toLocaleString("en-IN", IST)}
                    </p>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                      <span className={`chip chip-${a.orbit_type}`}>{a.orbit_type}</span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Score at save: {a.score_total}
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Weather: {a.score_weather?.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                <button onClick={() => removeAlert(a.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
                  title="Remove alert">
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* How it works */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <p className="section-label">How alerts work</p>
        <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            "Click the bell icon on any result card to save that window",
            "The window's datetime and current weather score are stored locally",
            `Every 30 minutes the app fetches live weather for Sriharikota`,
            `If the weather score drops below ${SCRUB_THRESHOLD}, a browser notification fires`,
            "Alerts persist across page reloads via localStorage",
          ].map((s, i) => (
            <li key={i} style={{ fontSize: 12, color: "var(--text-muted)" }}>{s}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
