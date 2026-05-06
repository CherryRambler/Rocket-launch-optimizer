import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Calendar, Database, Cloud, Info } from "lucide-react";
import { fetchHistoricalMissions } from "../api";
import LiquidGlassCard from "./LiquidGlassCard";

function ScoreRing({ score }) {
  const r     = 28;
  const circ  = 2 * Math.PI * r;
  const color = score >= 80 ? "#00f2ff" : score >= 60 ? "#ffc107" : "#ff4444";
  return (
    <div style={{ position: "relative", width: 72, height: 72 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <motion.circle
          cx="36" cy="36" r={r}
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (score / 100) * circ }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          transform="rotate(-90 36 36)"
          style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <span className="mono" style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>{score.toFixed(0)}</span>
        <span style={{ fontSize: 8, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Score</span>
      </div>
    </div>
  );
}

function SubScore({ label, val }) {
  const color = val >= 70 ? "#00f2ff" : val >= 50 ? "#ffc107" : "#ff4444";
  return (
    <div style={{ textAlign: "center", padding: "10px 6px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>{label}</p>
      <p className="mono" style={{ fontSize: 14, fontWeight: 800, color }}>{val.toFixed(0)}</p>
    </div>
  );
}

function MissionCard({ mission, index }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      onClick={() => setFlipped(f => !f)}
      style={{ perspective: 1200, cursor: "pointer" }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{ position: "relative", transformStyle: "preserve-3d", height: 340 }}
      >
        {/* ── Front ──────────────────────────────────────────────────────── */}
        <LiquidGlassCard style={{ padding: 24, backfaceVisibility: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
            <ScoreRing score={mission.optimizer_score} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0 }}>{mission.name}</h3>
                <span className={`chip chip-${mission.orbit_type}`} style={{ fontSize: 9, padding: "1px 6px" }}>{mission.orbit_type}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={10} color="rgba(255,255,255,0.4)" />
                <p className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>{mission.launch_date.slice(0, 10)}</p>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: mission.launch_success ? "var(--green)" : "#ff4444" }}>
                  {mission.launch_success ? "MISSION SUCCESS" : "MISSION FAILURE"}
                </span>
              </div>
            </div>
            <RotateCcw size={12} color="rgba(255,255,255,0.3)" className="spin-hover" />
          </div>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: "auto" }}>
            {mission.description}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 24 }}>
            <SubScore label="Orbital"  val={mission.score_orbital} />
            <SubScore label="Energy"  val={mission.score_delta_v} />
            <SubScore label="Atmo"  val={mission.score_weather} />
          </div>
        </LiquidGlassCard>

        {/* ── Back ───────────────────────────────────────────────────────── */}
        <LiquidGlassCard style={{
          padding: 24, position: "absolute", inset: 0,
          backfaceVisibility: "hidden", transform: "rotateY(180deg)",
          height: "100%", display: "flex", flexDirection: "column"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Database size={14} color="var(--cyan)" />
            <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--cyan)", margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>Post-Launch Telemetry</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <DataRow label="Calculated Δv Efficiency" val={`${mission.delta_v_ms.toLocaleString()} m/s`} hi />
            <DataRow label="Payload Configuration"   val={`${mission.payload_mass_kg.toLocaleString()} kg`} />
            <DataRow label="Historical Timestamp"     val={mission.launch_date.slice(0, 10)} />
          </div>

          <div style={{ marginTop: 24, padding: 16, background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", height: 100 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Cloud size={12} color="var(--cyan)" />
              <p style={{ fontSize: 10, color: "var(--cyan)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Verified Atmosphere</p>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, margin: 0, height: 40, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {mission.actual_weather_desc}
            </p>
          </div>

          <div style={{ marginTop: "auto", padding: "12px 14px", background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: "var(--cyan)", lineHeight: 1.5, margin: 0, fontStyle: "italic", height: 36, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              "{mission.fun_fact}"
            </p>
          </div>
        </LiquidGlassCard>
      </motion.div>
    </motion.div>
  );
}

function DataRow({ label, val, hi }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{label}</span>
      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: hi ? "var(--cyan)" : "rgba(255,255,255,0.9)" }}>{val}</span>
    </div>
  );
}

export default function HistoricalReplay() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetchHistoricalMissions()
      .then(setMissions)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 20 }}>
      <div className="spin" style={{ width: 40, height: 40, border: "3px solid rgba(0,212,255,0.1)", borderTopColor: "var(--cyan)", borderRadius: "50%" }} />
      <p className="mono" style={{ fontSize: 14, color: "var(--text-dim)" }}>Accessing historical mission archives...</p>
    </div>
  );

  if (error) return <p className="mono" style={{ fontSize: 13, color: "#ff4444", padding: 40 }}>{error}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>Mission Archives</h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8, maxWidth: 800, lineHeight: 1.6 }}>
          A retroactive analysis of verified orbital missions. Historical telemetry is processed through our 
          optimizer engine to validate scoring accuracy against actual launch outcomes.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 20 }}>
        {missions.map((m, i) => <MissionCard key={m.name} mission={m} index={i} />)}
      </div>

      <LiquidGlassCard style={{ padding: 24, display: "flex", gap: 20, alignItems: "flex-start" }}>
        <Info size={24} color="var(--cyan)" style={{ flexShrink: 0 }} />
        <div>
          <p className="section-label" style={{ marginBottom: 8 }}>Validation Methodology</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8, margin: 0 }}>
            Scores are computed by running the exact orbital mechanics algorithm on actual historical launch timestamps. 
            Orbital alignment and Δv calculations use physics-based deterministic models. Atmospheric data for older 
            missions is synthesized from global climate archives to provide high-fidelity weather scoring.
          </p>
        </div>
      </LiquidGlassCard>
    </div>
  );
}
