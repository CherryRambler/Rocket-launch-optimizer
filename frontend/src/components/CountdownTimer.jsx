import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function remaining(iso) {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

function FlipDigit({ digit }) {
  return (
    <div className="countdown-digit-box">
      <AnimatePresence mode="wait">
        <motion.span
          key={digit}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.2 }}
          className="countdown-digit-text mono"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function SlotNumber({ value }) {
  const padded = String(value).padStart(2, "0");
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      <FlipDigit digit={padded[0]} />
      <FlipDigit digit={padded[1]} />
    </div>
  );
}

function SlotUnit({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <SlotNumber value={value} />
      <span style={{ 
        fontSize: 10, 
        fontWeight: 700, 
        color: "var(--text-dim)", 
        letterSpacing: "0.2em",
        textTransform: "uppercase"
      }}>
        {label}
      </span>
    </div>
  );
}

export default function CountdownTimer({ windows }) {
  const [idx, setIdx]   = useState(0);
  const [left, setLeft] = useState(null);

  useEffect(() => {
    if (!windows?.length) return;
    const tick = () => {
      const r = remaining(windows[idx]?.timestamp);
      if (!r) {
        if (idx < windows.length - 1) setIdx((i) => i + 1);
        else setLeft(null);
      } else setLeft(r);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [windows, idx]);

  if (!left) return null;

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      width: "100%",
      gap: 56,
      padding: "40px 0"
    }}>
      {/* Timer Row - Scaled Up */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        gap: 32,
      }}>
        {left.d > 0 && (
          <>
            <SlotUnit label="DAYS" value={left.d} />
            <div className="countdown-sep">:</div>
          </>
        )}
        <SlotUnit label="HOURS" value={left.h} />
        <div className="countdown-sep">:</div>
        <SlotUnit label="MINUTES" value={left.m} />
        <div className="countdown-sep">:</div>
        <SlotUnit label="SECONDS" value={left.s} />
      </div>

      {/* Telemetry Grid - Larger & Centered */}
      {windows[idx] && (
        <div className="fade-up" style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(4, 1fr)", 
          gap: 64, 
          padding: "32px 64px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.1)",
          width: "100%",
          maxWidth: 1000
        }}>
          <div style={{ textAlign: "center" }}>
            <p className="mono" style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 12 }}>Mission Rank</p>
            <p className="mono" style={{ fontSize: 28, color: "var(--cyan)", fontWeight: 800 }}>TOP {windows[idx].rank}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p className="mono" style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 12 }}>Req. Delta-V</p>
            <p className="mono" style={{ fontSize: 28, color: "var(--text)", fontWeight: 700 }}>{windows[idx].delta_v_ms.toFixed(0)} <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 400 }}>m/s</span></p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p className="mono" style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 12 }}>Opt. Azimuth</p>
            <p className="mono" style={{ fontSize: 28, color: "var(--text)", fontWeight: 700 }}>{windows[idx].azimuth_deg.toFixed(1)}°</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p className="mono" style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 12 }}>Local Wind</p>
            <p className="mono" style={{ fontSize: 28, color: "var(--text)", fontWeight: 700 }}>{windows[idx].wind_speed_ms.toFixed(1)} <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 400 }}>m/s</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
