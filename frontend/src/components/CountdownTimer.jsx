import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function remaining(iso) {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function Box({ value, label }) {
  return (
    <div className="cd-box">
      <AnimatePresence mode="popLayout">
        <motion.span key={value}
          initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--cyan)", lineHeight: 1 }}
        >
          {String(value).padStart(2, "0")}
        </motion.span>
      </AnimatePresence>
      <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>
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
        if (idx < windows.length - 1) setIdx(i => i + 1);
        else setLeft(null);
      } else setLeft(r);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [windows, idx]);

  if (!left) return <p className="mono" style={{ fontSize: 13, color: "var(--text-muted)" }}>No upcoming window</p>;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {left.d > 0 && <Box value={left.d} label="days" />}
      <Box value={left.h} label="hrs" />
      <Box value={left.m} label="min" />
      <Box value={left.s} label="sec" />
      {windows[idx] && (
        <div style={{ marginLeft: 12 }}>
          <p className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>Window #{windows[idx].rank}</p>
          <p className="mono" style={{ fontSize: 11, color: "var(--cyan)" }}>Score {windows[idx].score_total}</p>
        </div>
      )}
    </div>
  );
}
