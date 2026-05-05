import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import { Plus, Trash2, Play } from "lucide-react";
import { useApp } from "../context/AppContext";
import { calculateWindows } from "../api";

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

  // Find slot with earliest best window
  const earliest = slots.filter(s => s.result).reduce((best, s) => {
    if (!best) return s;
    return new Date(s.result.best_window.timestamp) < new Date(best.result.best_window.timestamp) ? s : best;
  }, null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>Mission Comparison</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Compare up to 3 missions side by side
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {slots.length < 3 && (
            <button className="btn-ghost" onClick={() => setSlots(p => [...p, mkSlot()])}>
              <Plus size={13} /> Add mission
            </button>
          )}
          <button className="btn-primary" onClick={runAll}>
            <Play size={13} /> Run all
          </button>
        </div>
      </div>

      {/* Columns */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${slots.length}, 1fr)`, gap: 16 }}>
        {slots.map((slot, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }} className="card" style={{ padding: 20 }}>

            {/* Name + remove */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <input
                value={slot.name}
                onChange={e => upd(i, "name", e.target.value)}
                placeholder={`Mission ${i + 1}`}
                className="field-input"
                style={{ flex: 1, fontSize: 13, fontWeight: 600 }}
              />
              {slots.length > 1 && (
                <button onClick={() => setSlots(p => p.filter((_, idx) => idx !== i))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* Config */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <SelectRow label="Orbit" value={slot.orbit_type} onChange={v => upd(i, "orbit_type", v)} options={["LEO","GEO","SSO"]} />
              <InputRow  label="Start" type="date" value={slot.start_date} onChange={v => upd(i, "start_date", v)} />
              <InputRow  label="End"   type="date" value={slot.end_date}   onChange={v => upd(i, "end_date",   v)} />
              <InputRow  label="Payload (kg)" type="number" min={1} max={10000}
                value={slot.payload_mass_kg} onChange={v => upd(i, "payload_mass_kg", v)} />
            </div>

            <button className="btn-ghost" style={{ width: "100%", justifyContent: "center" }}
              onClick={() => run(i)} disabled={slot.loading}>
              {slot.loading ? "Calculating…" : "Calculate"}
            </button>

            {slot.error && (
              <p className="mono" style={{ fontSize: 11, color: "#f44336", marginTop: 10 }}>{slot.error}</p>
            )}

            {/* Results */}
            {slot.result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span className={`chip chip-${slot.orbit_type}`}>{slot.orbit_type}</span>
                  {earliest === slot && (
                    <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600 }}>Earliest optimal</span>
                  )}
                </div>

                <p className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                  Best: {new Date(slot.result.best_window.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>

                <ScoreBar score={slot.result.best_window.score_total} />

                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {slot.result.windows.slice(0, 4).map(w => (
                    <div key={w.rank} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span className="mono" style={{ color: "var(--text-muted)" }}>
                        #{w.rank} {new Date(w.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="mono" style={{ color: w.score_total >= 80 ? "var(--green)" : w.score_total >= 60 ? "#ffc107" : "#f44336", fontWeight: 600 }}>
                        {w.score_total}
                      </span>
                    </div>
                  ))}
                </div>

                <button className="btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 12, fontSize: 12 }}
                  onClick={() => saveMission(slot.name || `Mission ${i+1}`, slot, slot.result)}>
                  Save mission
                </button>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Saved missions */}
      {savedMissions.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <p className="section-label">Saved Missions</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {savedMissions.map(m => (
              <div key={m.name} style={{ padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{m.name}</span>
                  <button onClick={() => deleteMission(m.name)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {m.config?.orbit_type} · {m.config?.payload_mass_kg} kg
                </p>
                {m.results && (
                  <p className="mono" style={{ fontSize: 12, color: "var(--cyan)", marginTop: 4 }}>
                    Best score: {m.results.best_window?.score_total}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ score }) {
  const color = score >= 80 ? "var(--green)" : score >= 60 ? "#ffc107" : "#f44336";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div className="progress-track" style={{ flex: 1 }}>
        <motion.div style={{ height: "100%", background: color, borderRadius: 1 }}
          initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.7 }} />
      </div>
      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color, minWidth: 32 }}>{score}</span>
    </div>
  );
}

function SelectRow({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 56 }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="field-input" style={{ flex: 1, padding: "6px 10px" }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function InputRow({ label, onChange, ...props }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 56 }}>{label}</span>
      <input className="field-input" style={{ flex: 1, padding: "6px 10px" }}
        onChange={e => onChange(e.target.value)} {...props} />
    </div>
  );
}
