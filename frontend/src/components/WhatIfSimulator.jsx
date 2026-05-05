import { useState, useCallback, useRef } from "react";
import { useApp } from "../context/AppContext";

const SLIDERS = [
  { key: "payload_mass_kg",   label: "Payload mass",     unit: "kg",   min: 100, max: 5000, step: 50  },
  { key: "weather_weight_pct",label: "Weather weight",   unit: "%",    min: 0,   max: 100,  step: 5   },
  { key: "wind_tolerance_kmh",label: "Wind tolerance",   unit: "km/h", min: 10,  max: 180,  step: 5   },
];

export default function WhatIfSimulator({ onRecalculate }) {
  const { formValues, setFormValues } = useApp();
  const debounce = useRef(null);

  const [local, setLocal] = useState({
    payload_mass_kg:    formValues.payload_mass_kg     ?? 500,
    weather_weight_pct: (formValues.weather_weight     ?? 0.20) * 100,
    wind_tolerance_kmh: formValues.wind_tolerance_kmh  ?? 54,
  });

  const onChange = useCallback((key, raw) => {
    setLocal(p => ({ ...p, [key]: raw }));
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
    return <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Run a calculation first to enable the simulator.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {SLIDERS.map(s => {
        const val = local[s.key];
        return (
          <div key={s.key}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--cyan)" }}>{val} {s.unit}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={s.step} value={val}
              onChange={e => onChange(s.key, parseFloat(e.target.value))} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>{s.min}</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>{s.max}</span>
            </div>
          </div>
        );
      })}

      <p className="mono" style={{ fontSize: 10, color: "var(--text-dim)", paddingTop: 4, borderTop: "1px solid var(--border)" }}>
        Recalculates automatically on change (300 ms debounce)
      </p>
    </div>
  );
}
