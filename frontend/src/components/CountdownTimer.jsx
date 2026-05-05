import { useState, useEffect } from "react";
import { motion } from "framer-motion";

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

// A single digit reel — 0-9 stacked, animated by translateY
function Reel({ digit }) {
  const d = parseInt(digit, 10);
  return (
    <div className="slot-reel">
      <motion.div
        className="slot-strip"
        animate={{ y: `-${d * 10}%` }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <div key={n} className="slot-digit">{n}</div>
        ))}
      </motion.div>
    </div>
  );
}

// Two-digit slot display (tens + ones)
function SlotNumber({ value }) {
  const padded = String(value).padStart(2, "0");
  return (
    <div style={{ display: "flex" }}>
      <Reel digit={padded[0]} />
      <Reel digit={padded[1]} />
    </div>
  );
}

function SlotUnit({ label, value }) {
  return (
    <div className="slot-unit">
      <div className="slot-frame">
        <SlotNumber value={value} />
      </div>
      <span className="slot-label">{label}</span>
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

  if (!left)
    return (
      <p className="mono" style={{ fontSize: 13, color: "var(--text-muted)" }}>
        No upcoming window
      </p>
    );

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
      {left.d > 0 && <SlotUnit label="DAYS" value={left.d} />}
      <SlotUnit label="HRS"  value={left.h} />
      <div className="slot-sep">:</div>
      <SlotUnit label="MIN"  value={left.m} />
      <div className="slot-sep">:</div>
      <SlotUnit label="SEC"  value={left.s} />

      {windows[idx] && (
        <div style={{ marginLeft: 16, paddingLeft: 16, borderLeft: "1px solid var(--border)" }}>
          <p className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Window #{windows[idx].rank}
          </p>
          <p className="mono" style={{ fontSize: 13, color: "var(--cyan)", fontWeight: 700 }}>
            Score {windows[idx].score_total}
          </p>
        </div>
      )}
    </div>
  );
}
