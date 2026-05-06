import { useState } from "react";
import { format, addDays } from "date-fns";
import { Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";

const ORBITS = [
  { value: "LEO", label: "LEO", detail: "500 km · Low Earth" },
  { value: "GEO", label: "GEO", detail: "35,786 km · Geostationary" },
  { value: "SSO", label: "SSO", detail: "600 km · Sun-Synchronous" },
];

export default function InputForm({ onSubmit }) {
  const { formValues, setFormValues, loading, selectedSite } = useApp();
  const today    = format(new Date(), "yyyy-MM-dd");
  const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const [v, setV] = useState({
    orbit_type:          formValues.orbit_type          ?? "LEO",
    start_date:          formValues.start_date          || today,
    end_date:            formValues.end_date            || nextWeek,
    payload_mass_kg:     formValues.payload_mass_kg     ?? 500,
    weather_weight:      formValues.weather_weight      ?? 0.20,
    wind_tolerance_kmh:  formValues.wind_tolerance_kmh  ?? 54,
  });

  const set = (key, val) => setV(p => ({ ...p, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { 
      ...v, 
      payload_mass_kg: parseFloat(v.payload_mass_kg),
      launch_site: selectedSite.id,
      launch_site_name: selectedSite.name,
      lat: selectedSite.lat,
      lon: selectedSite.lon
    };
    setFormValues(payload);
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Orbit selector */}
      <div>
        <FieldLabel>Orbit type</FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 6 }}>
          {ORBITS.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => set("orbit_type", o.value)}
              style={{
                padding: "10px 8px",
                borderRadius: 8,
                border: `1px solid ${v.orbit_type === o.value ? "var(--border-hi)" : "var(--border)"}`,
                background: v.orbit_type === o.value ? "rgba(0,210,255,0.06)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <p className="mono" style={{ fontSize: 13, fontWeight: 700, color: v.orbit_type === o.value ? "var(--cyan)" : "var(--text)", marginBottom: 2 }}>
                {o.label}
              </p>
              <p style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.3 }}>{o.detail}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Start date" type="date" value={v.start_date} min={today}
          onChange={e => set("start_date", e.target.value)} />
        <Field label="End date" type="date" value={v.end_date} min={v.start_date}
          onChange={e => set("end_date", e.target.value)} />
      </div>

      {/* Payload slider */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <FieldLabel>Payload mass</FieldLabel>
          <span className="mono" style={{ fontSize: 12, color: "var(--cyan)" }}>{v.payload_mass_kg} kg</span>
        </div>
        <input type="range" min={10} max={5000} step={10}
          value={v.payload_mass_kg}
          onChange={e => set("payload_mass_kg", parseFloat(e.target.value))} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>10 kg</span>
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>5,000 kg</span>
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={loading}
        style={{ width: "100%", justifyContent: "center" }}>
        {loading
          ? <><Loader2 size={14} className="animate-spin" /> Calculating…</>
          : "Calculate Launch Windows"}
      </button>
    </form>
  );
}

function FieldLabel({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 0 }}>
      {children}
    </p>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input className="field-input" style={{ marginTop: 6 }} {...props} />
    </div>
  );
}
