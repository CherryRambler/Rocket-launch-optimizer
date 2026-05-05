import { useState, useCallback, useRef } from "react";
import { useApp } from "../context/AppContext";

const SLIDERS = [
  { key: "payload_mass_kg",    label: "Payload mass",   unit: "kg",   min: 100,  max: 5000, step: 50  },
  { key: "weather_weight_pct", label: "Weather weight", unit: "%",    min: 0,    max: 100,  step: 5   },
  { key: "wind_tolerance_kmh", label: "Wind tolerance", unit: "km/h", min: 10,   max: 180,  step: 5   },
];

// ── Custom neumorphic slider ───────────────────────────────────────────────────
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
      className={`neu-track ${dragging ? "neu-track--drag" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
    >
      {/* Filled portion */}
      <div className="neu-fill" style={{ width: `${pct}%` }} />
      {/* Thumb */}
      <div
        className={`neu-thumb ${dragging ? "neu-thumb--drag" : ""}`}
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

// ── Simulator ─────────────────────────────────────────────────────────────────
export default function WhatIfSimulator({ onRecalculate }) {
  const { formValues, setFormValues } = useApp();
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
      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Run a calculation first to enable the simulator.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {SLIDERS.map((s) => {
        const val = local[s.key];
        return (
          <div key={s.key}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="neu-slider-label">{s.label}</span>
              <span className="mono neu-slider-value">{val} {s.unit}</span>
            </div>
            <NeumorphicSlider
              min={s.min}
              max={s.max}
              step={s.step}
              value={val}
              unit={s.unit}
              onChange={(v) => onChange(s.key, v)}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>{s.min}</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>{s.max}</span>
            </div>
          </div>
        );
      })}

      <p className="mono" style={{
        fontSize: 10, color: "var(--text-dim)",
        paddingTop: 8, borderTop: "1px solid var(--border)",
      }}>
        Auto-recalculates on change · 300 ms debounce
      </p>
    </div>
  );
}
