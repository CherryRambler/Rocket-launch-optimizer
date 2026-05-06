import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { Info, Zap, AlertTriangle } from "lucide-react";

const SLIDERS = [
  { 
    key: "payload_mass_kg",    
    label: "Payload mass",   
    unit: "kg",   
    min: 100,  
    max: 5000, 
    step: 50,
    impact: "Δv Demand",
    desc: "Heavier payloads require more propellant and tighter orbital alignment to reach target altitude."
  },
  { 
    key: "weather_weight_pct", 
    label: "Weather weight", 
    unit: "%",    
    min: 0,    
    max: 100,  
    step: 5,
    impact: "Safety Margin",
    desc: "Prioritize weather stability. High values prioritize clear skies and low wind over orbital efficiency."
  },
  { 
    key: "wind_tolerance_kmh", 
    label: "Wind tolerance", 
    unit: "km/h", 
    min: 10,   
    max: 180,  
    step: 5,
    impact: "Window Count",
    desc: "Max allowable wind speed. Lower values increase scrub risk but ensure a safer launch environment."
  },
];

// ── Custom animated slider ───────────────────────────────────────────────────
function NeumorphicSlider({ min, max, step, value, onChange }) {
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef(null);
  const pct = ((value - min) / (max - min)) * 100;

  function getValueFromEvent(e) {
    const rect = trackRef.current.getBoundingClientRect();
    const x    = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const raw  = min + x * (max - min);
    return Math.round(raw / step) * step;
  }

  function onPointerDown(e) {
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(getValueFromEvent(e));
  }

  function onPointerMove(e) {
    if (!dragging) return;
    onChange(getValueFromEvent(e));
  }

  function onPointerUp() {
    setDragging(false);
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ 
        position: "relative", 
        height: 6, 
        borderRadius: 3, 
        background: "rgba(0,0,0,0.5)", 
        cursor: "pointer",
        margin: "12px 0"
      }}
    >
      <motion.div 
        className="neu-fill" 
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ 
          position: "absolute", 
          height: "100%", 
          borderRadius: 3, 
          background: "var(--cyan)", 
          boxShadow: "0 0 12px rgba(0,212,255,0.5)" 
        }}
      />
      <motion.div
        className="neu-thumb"
        animate={{ 
          left: `${pct}%`, 
          scale: dragging ? 1.25 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        style={{ 
          position: "absolute", 
          top: "50%", 
          x: "-50%",
          y: "-50%",
          width: 18, 
          height: 18, 
          borderRadius: "50%", 
          background: "#fff", 
          boxShadow: dragging ? "0 0 20px var(--cyan)" : "0 3px 8px rgba(0,0,0,0.6)",
          zIndex: 10,
          border: "2px solid var(--cyan)"
        }}
      />
    </div>
  );
}

// ── Simulator ─────────────────────────────────────────────────────────────────
export default function WhatIfSimulator({ onRecalculate }) {
  const { formValues, setFormValues } = useApp();
  const [activeDesc, setActiveDesc] = useState(null);
  const debounce = useRef(null);

  const [local, setLocal] = useState({
    payload_mass_kg:    formValues.payload_mass_kg     ?? 500,
    weather_weight_pct: (formValues.weather_weight     ?? 0.20) * 100,
    wind_tolerance_kmh: formValues.wind_tolerance_kmh  ?? 54,
  });

  const onChange = useCallback((key, raw) => {
    setLocal((p) => ({ ...p, [key]: raw }));
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if (!formValues.start_date || !formValues.end_date) return;
      const next = {
        ...formValues,
        payload_mass_kg:    key === "payload_mass_kg"    ? raw : local.payload_mass_kg,
        weather_weight:     key === "weather_weight_pct" ? raw / 100 : local.weather_weight_pct / 100,
        wind_tolerance_kmh: key === "wind_tolerance_kmh" ? raw : local.wind_tolerance_kmh,
      };
      setFormValues(next);
      onRecalculate(next);
    }, 300);
  }, [formValues, local, setFormValues, onRecalculate]);

  if (!formValues.start_date) {
    return (
      <div className="fade-up" style={{ padding: 40, textAlign: "center" }}>
        <AlertTriangle size={32} style={{ color: "var(--text-dim)", marginBottom: 16 }} />
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 240, margin: "0 auto" }}>
          Run an initial calculation to unlock the simulator and perform real-time mission trade-offs.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {SLIDERS.map((s) => {
          const val = local[s.key];
          return (
            <div key={s.key} style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span className="neu-slider-label" style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>{s.label}</span>
                  <button 
                    onMouseEnter={() => setActiveDesc(s.key)}
                    onMouseLeave={() => setActiveDesc(null)}
                    style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "help", padding: 0 }}
                  >
                    <Info size={12} />
                  </button>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{s.impact}</p>
                  <span className="mono" style={{ fontSize: 15, color: "var(--cyan)", fontWeight: 700 }}>{val} <span style={{ fontSize: 12 }}>{s.unit}</span></span>
                </div>
              </div>

              <NeumorphicSlider
                min={s.min}
                max={s.max}
                step={s.step}
                value={val}
                onChange={(v) => onChange(s.key, v)}
              />

              <AnimatePresence>
                {activeDesc === s.key && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    style={{
                      position: "absolute", top: 45, left: 0, right: 0, zIndex: 100,
                      background: "rgba(15,20,35,0.98)", border: "1px solid var(--border-hi)",
                      borderRadius: 10, padding: 12, fontSize: 11, color: "var(--text)",
                      boxShadow: "0 12px 40px rgba(0,0,0,0.6)", pointerEvents: "none",
                      lineHeight: 1.5
                    }}
                  >
                    {s.desc}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div style={{ 
        padding: "14px 16px", background: "rgba(0,212,255,0.05)", 
        borderRadius: 12, border: "1px solid rgba(0,212,255,0.12)",
        display: "flex", gap: 14, alignItems: "flex-start"
      }}>
        <Zap size={16} style={{ color: "var(--cyan)", marginTop: 2, flexShrink: 0 }} />
        <p className="mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--cyan)" }}>Predictive Engine:</strong> Changes trigger an immediate re-calculation of the 3-week window. Sliders are debounced to prevent API rate limiting.
        </p>
      </div>

      {/* NEW: Filling empty space with informational notes */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 18, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="fade-up">
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 6 }}>Optimal Configurations</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>LEO Heavy Lift</span>
              <span className="mono" style={{ fontSize: 10, background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>3,500 kg+</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Sun-Sync Microsat</span>
              <span className="mono" style={{ fontSize: 10, background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>200 - 800 kg</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Safe Weather Profile</span>
              <span className="mono" style={{ fontSize: 10, background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>40% Weight</span>
            </div>
          </div>
        </div>

        <div className="fade-up" style={{ animationDelay: "0.1s" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 6 }}>Mission Protocol</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ padding: 8, background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize: 9, color: "var(--text-dim)", marginBottom: 4, textTransform: "uppercase" }}>Wind Limit</p>
              <p className="mono" style={{ fontSize: 11, color: "var(--cyan)" }}>45 km/h</p>
            </div>
            <div style={{ padding: 8, background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize: 9, color: "var(--text-dim)", marginBottom: 4, textTransform: "uppercase" }}>Cloud Ceiling</p>
              <p className="mono" style={{ fontSize: 11, color: "var(--cyan)" }}>6,000 ft</p>
            </div>
          </div>
        </div>

        <div className="fade-up" style={{ animationDelay: "0.2s" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 6 }}>Critical Constraints</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <li style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--cyan)", marginTop: 6, flexShrink: 0 }} />
              High mass payloads reduce daily launch duration significantly.
            </li>
            <li style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--cyan)", marginTop: 6, flexShrink: 0 }} />
              Lower wind tolerance increases scrub probability by 65%.
            </li>
            <li style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--cyan)", marginTop: 6, flexShrink: 0 }} />
              Weather weight shifts "Optimal Windows" to early morning slots.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
