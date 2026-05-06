import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import { Plus, Trash2, Play, Info, Activity, Wind, Compass } from "lucide-react";
import { useApp } from "../context/AppContext";
import { calculateWindows } from "../api";
import LiquidGlassCard from "./LiquidGlassCard";

const today    = format(new Date(), "yyyy-MM-dd");
const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");
const mkSlot   = () => ({ name: "", orbit_type: "LEO", start_date: today, end_date: nextWeek, payload_mass_kg: 500, weather_weight: 0.20, wind_tolerance_kmh: 54, result: null, loading: false, error: null });

export default function MissionComparison() {
  const { savedMissions, saveMission, deleteMission } = useApp();
  const [slots, setSlots] = useState([mkSlot(), mkSlot()]);

  const upd = (i, key, val) =>
    setSlots(p => p.map((s, idx) => idx === i ? { ...s, [key]: val } : s));

  const run = useCallback(async (i) => {
    const s = slots[i];
    upd(i, "loading", true); upd(i, "error", null);
    try {
      const res = await calculateWindows({ orbit_type: s.orbit_type, start_date: s.start_date, end_date: s.end_date, payload_mass_kg: parseFloat(s.payload_mass_kg), weather_weight: s.weather_weight, wind_tolerance_kmh: s.wind_tolerance_kmh });
      setSlots(p => p.map((sl, idx) => idx === i ? { ...sl, result: res, loading: false } : sl));
    } catch (err) {
      setSlots(p => p.map((sl, idx) => idx === i ? { ...sl, error: err.response?.data?.detail || err.message, loading: false } : sl));
    }
  }, [slots]);

  const runAll = () => slots.forEach((_, i) => run(i));

  const earliest = slots.filter(s => s.result).reduce((best, s) => {
    if (!best) return s;
    return new Date(s.result.best_window.timestamp) < new Date(best.result.best_window.timestamp) ? s : best;
  }, null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>Mission Comparison</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Parallel simulation and cross-mission telemetry analysis
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {slots.length < 3 && (
            <button className="btn-ghost" onClick={() => setSlots(p => [...p, mkSlot()])} style={{ height: 38 }}>
              <Plus size={14} /> Add Mission Slot
            </button>
          )}
          <button className="btn-primary" onClick={runAll} style={{ height: 38, padding: "0 20px" }}>
            <Play size={14} /> Run Simultaneous Analysis
          </button>
        </div>
      </div>

      {/* Columns */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${slots.length}, 1fr)`, gap: 20 }}>
        {slots.map((slot, i) => (
          <LiquidGlassCard key={i} accent={earliest === slot} style={{ padding: 24, display: "flex", flexDirection: "column", minHeight: 600 }}>
            {/* Name + remove */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <p className="mono" style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Slot 0{i + 1}</p>
                <input
                  value={slot.name}
                  onChange={e => upd(i, "name", e.target.value)}
                  placeholder={`Mission Alpha`}
                  className="field-input"
                  style={{ width: "100%", fontSize: 15, fontWeight: 700, background: "transparent", border: "none", padding: 0, borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                />
              </div>
              {slots.length > 1 && (
                <button onClick={() => setSlots(p => p.filter((_, idx) => idx !== i))}
                  className="btn-icon-ghost" style={{ color: "var(--text-dim)" }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Config */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <SelectRow label="Target Orbit" value={slot.orbit_type} onChange={v => upd(i, "orbit_type", v)} options={["LEO","GEO","SSO"]} />
              <InputRow  label="Window Start" type="date" value={slot.start_date} onChange={v => upd(i, "start_date", v)} />
              <InputRow  label="Window End"   type="date" value={slot.end_date}   onChange={v => upd(i, "end_date",   v)} />
              <InputRow  label="Payload (kg)" type="number" min={1} max={10000}
                value={slot.payload_mass_kg} onChange={v => upd(i, "payload_mass_kg", v)} />
            </div>

            <button className="btn-primary" style={{ width: "100%", justifyContent: "center", height: 40, background: "rgba(0, 212, 255, 0.05)", border: "1px solid rgba(0, 212, 255, 0.2)", color: "var(--cyan)" }}
              onClick={() => run(i)} disabled={slot.loading}>
              {slot.loading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="spin" style={{ width: 12, height: 12, border: "2px solid var(--cyan)", borderTopColor: "transparent", borderRadius: "50%" }} />
                  Computing...
                </div>
              ) : "Initialize Analysis"}
            </button>

            {slot.error && (
              <p className="mono" style={{ fontSize: 11, color: "#ff4444", marginTop: 12, padding: 10, background: "rgba(255,68,68,0.05)", borderRadius: 6, border: "1px solid rgba(255,68,68,0.1)" }}>{slot.error}</p>
            )}

            {/* Results */}
            {slot.result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <span className={`chip chip-${slot.orbit_type}`} style={{ fontSize: 10, padding: "2px 8px" }}>{slot.orbit_type} ARCHITECTURE</span>
                  {earliest === slot && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green)" }}>
                      <Activity size={10} />
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Earliest Window</span>
                    </div>
                  )}
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", marginBottom: 16 }}>
                  <p className="mono" style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 8 }}>Primary Window Analysis</p>
                  <p className="mono" style={{ fontSize: 14, color: "var(--text)", fontWeight: 700, marginBottom: 12 }}>
                    {new Date(slot.result.best_window.timestamp).toLocaleString("en-IN", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <ScoreBar score={slot.result.best_window.score_total} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <MiniMetric icon={<Wind size={10} />} label="Wind Tol." val={`${slot.result.best_window.wind_speed_ms.toFixed(1)} m/s`} />
                  <MiniMetric icon={<Compass size={10} />} label="Opt. Azimuth" val={`${slot.result.best_window.azimuth_deg.toFixed(1)}°`} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  <p className="mono" style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Alternative Slots</p>
                  {slot.result.windows.slice(1, 4).map(w => (
                    <div key={w.rank} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "6px 8px", background: "rgba(255,255,255,0.01)", borderRadius: 4 }}>
                      <span className="mono" style={{ color: "var(--text-muted)" }}>
                         T+{Math.floor((new Date(w.timestamp) - new Date(slot.result.best_window.timestamp))/3600000)}h Shift
                      </span>
                      <span className="mono" style={{ color: w.score_total >= 80 ? "var(--green)" : w.score_total >= 60 ? "#ffc107" : "#ff4444", fontWeight: 700 }}>
                        {w.score_total}%
                      </span>
                    </div>
                  ))}
                </div>

                <button className="btn-ghost" style={{ width: "100%", justifyContent: "center", height: 36, fontSize: 12 }}
                  onClick={() => saveMission(slot.name || `Mission 0${i+1}`, slot, slot.result)}>
                  Archive Mission Profile
                </button>
              </motion.div>
            )}
          </LiquidGlassCard>
        ))}
      </div>

      {/* Saved missions */}
      {savedMissions.length > 0 && (
        <LiquidGlassCard style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Info size={16} color="var(--cyan)" />
            <p className="section-label" style={{ margin: 0 }}>Mission Archive</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {savedMissions.map(m => (
              <div key={m.name} style={{ padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{m.name}</span>
                    <p className="mono" style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>{m.config?.orbit_type} ARCHITECTURE</p>
                  </div>
                  <button onClick={() => deleteMission(m.name)}
                    className="btn-icon-ghost" style={{ color: "rgba(255,68,68,0.4)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                   <p className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {m.config?.payload_mass_kg.toLocaleString()}kg Payload
                  </p>
                  {m.results && (
                    <div style={{ textAlign: "right" }}>
                      <p className="mono" style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase" }}>Peak Efficiency</p>
                      <p className="mono" style={{ fontSize: 14, color: "var(--cyan)", fontWeight: 800 }}>{m.results.best_window?.score_total}%</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </LiquidGlassCard>
      )}
    </div>
  );
}

function MiniMetric({ icon, label, val }) {
  return (
    <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ color: "var(--text-dim)" }}>{icon}</span>
        <span style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <p className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{val}</p>
    </div>
  );
}

function ScoreBar({ score }) {
  const color = score >= 80 ? "var(--green)" : score >= 60 ? "#ffc107" : "#f44336";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div className="progress-track" style={{ flex: 1 }}>
        <motion.div
          style={{ height: "100%", background: color, borderRadius: 1 }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7 }}
        />
      </div>
      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color, minWidth: 32 }}>
        {score}
      </span>
    </div>
  );
}

function SelectRow({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 80 }}>{label}</span>
      <select 
        value={value} 
        onChange={e => onChange(e.target.value)}
        className="field-input" 
        style={{ flex: 1, padding: "6px 12px", background: "rgba(255,255,255,0.03)" }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function InputRow({ label, onChange, ...props }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 80 }}>{label}</span>
      <input 
        className="field-input" 
        style={{ flex: 1, padding: "6px 12px", background: "rgba(255,255,255,0.03)" }}
        onChange={e => onChange(e.target.value)} 
        {...props} 
      />
    </div>
  );
}
