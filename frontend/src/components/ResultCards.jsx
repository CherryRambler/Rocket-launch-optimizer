import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "../context/AppContext";

const IST = { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };

function useCountUp(target, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / ms, 1);
      setV(parseFloat((p * target).toFixed(1)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, ms]);
  return v;
}

function ScoreBadge({ score }) {
  const val = useCountUp(score);
  const color = score >= 80 ? "var(--green)" : score >= 60 ? "#ffc107" : "#f44336";
  return (
    <span className="mono" style={{ fontSize: 20, fontWeight: 700, color, minWidth: 44, textAlign: "right" }}>
      {val.toFixed(1)}
    </span>
  );
}

function SubScore({ label, val }) {
  const color = val >= 70 ? "var(--green)" : val >= 50 ? "#ffc107" : "#f44336";
  return (
    <div>
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{label}</p>
      <p className="mono" style={{ fontSize: 12, fontWeight: 600, color }}>{val.toFixed(0)}</p>
    </div>
  );
}

function Row({ win, index, selected, onClick }) {
  const { addAlert } = useApp();
  const ist = new Date(win.timestamp).toLocaleString("en-IN", IST);
  const isTop = win.rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      {/* Main row */}
      <div
        className="table-row"
        onClick={onClick}
        style={{
          display: "grid",
          gridTemplateColumns: "36px 1fr auto auto auto",
          alignItems: "center",
          gap: 16,
          padding: "12px 4px",
          background: selected ? "rgba(0,210,255,0.04)" : isTop ? "rgba(0,210,255,0.02)" : "transparent",
        }}
      >
        {/* Rank */}
        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: isTop ? "var(--cyan)" : "var(--text-muted)", textAlign: "center" }}>
          {isTop ? "#1" : `#${win.rank}`}
        </span>

        {/* Datetime + chips */}
        <div>
          <p className="mono" style={{ fontSize: 13, color: "var(--text)" }}>{ist}</p>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <span className={`chip chip-${win.orbit_type}`}>{win.orbit_type}</span>
            <span className={`chip chip-${win.launch_risk_level}`}>{win.launch_risk_level}</span>
          </div>
        </div>

        {/* Delta-V */}
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 10, color: "var(--text-muted)" }}>Delta-V</p>
          <p className="mono" style={{ fontSize: 12, color: "var(--text)" }}>{win.delta_v_ms.toLocaleString()} m/s</p>
        </div>

        {/* Azimuth */}
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 10, color: "var(--text-muted)" }}>Azimuth</p>
          <p className="mono" style={{ fontSize: 12, color: "var(--text)" }}>{win.azimuth_deg.toFixed(1)}°</p>
        </div>

        {/* Score + alert */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <ScoreBadge score={win.score_total} />
          <button
            onClick={e => { e.stopPropagation(); addAlert(win); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", padding: 0 }}
            title="Set scrub alert"
          >
            <Bell size={12} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
              gap: 12, padding: "12px 4px 16px",
              borderBottom: "1px solid var(--border)",
            }}>
              <SubScore label="Orbital align" val={win.score_orbital} />
              <SubScore label="Delta-V score"  val={win.score_delta_v} />
              <SubScore label="Weather score"  val={win.score_weather} />
              <Detail label="Cloud cover"   val={`${win.cloud_cover_pct}%`} />
              <Detail label="Wind speed"    val={`${win.wind_speed_ms} m/s`} />
              <Detail label="Payload"       val={`${win.payload_mass_kg} kg`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Detail({ label, val }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{label}</p>
      <p className="mono" style={{ fontSize: 12, color: "var(--text)" }}>{val}</p>
    </div>
  );
}

export default function ResultCards({ windows }) {
  const { selectedWindow, setSelectedWindow } = useApp();
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? windows : windows.slice(0, 10);

  return (
    <div>
      {/* Table header */}
      <div style={{
        display: "grid", gridTemplateColumns: "36px 1fr auto auto auto",
        gap: 16, padding: "0 4px 10px",
        borderBottom: "1px solid var(--border)",
      }}>
        {["Rank", "Window", "Delta-V", "Azimuth", "Score"].map(h => (
          <p key={h} style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: h === "Rank" ? "center" : h === "Window" ? "left" : "right" }}>
            {h}
          </p>
        ))}
      </div>

      {shown.map((w, i) => (
        <Row
          key={w.timestamp}
          win={w}
          index={i}
          selected={selectedWindow?.timestamp === w.timestamp}
          onClick={() => setSelectedWindow(p => p?.timestamp === w.timestamp ? null : w)}
        />
      ))}

      {windows.length > 10 && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="btn-ghost"
          style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
        >
          {showAll
            ? <><ChevronUp size={13} /> Show fewer</>
            : <><ChevronDown size={13} /> Show all {windows.length} windows</>}
        </button>
      )}
    </div>
  );
}
