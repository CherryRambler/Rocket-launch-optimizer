import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { fetchHistoricalMissions } from "../api";

function ScoreRing({ score }) {
  const r     = 28;
  const circ  = 2 * Math.PI * r;
  const color = score >= 80 ? "#00e676" : score >= 60 ? "#ffc107" : "#f44336";
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
      <motion.circle
        cx="36" cy="36" r={r}
        fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (score / 100) * circ }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        transform="rotate(-90 36 36)"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700"
        fill={color} fontFamily="JetBrains Mono, monospace">
        {score.toFixed(0)}
      </text>
    </svg>
  );
}

function SubScore({ label, val }) {
  const color = val >= 70 ? "#00e676" : val >= 50 ? "#ffc107" : "#f44336";
  return (
    <div style={{ textAlign: "center", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</p>
      <p className="mono" style={{ fontSize: 14, fontWeight: 700, color }}>{val.toFixed(0)}</p>
    </div>
  );
}

function MissionCard({ mission, index }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.35 }}
      onClick={() => setFlipped(f => !f)}
      style={{ perspective: 1000, cursor: "pointer" }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        style={{ position: "relative", transformStyle: "preserve-3d" }}
      >
        {/* ── Front ──────────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: 20, backfaceVisibility: "hidden" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <ScoreRing score={mission.optimizer_score} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>{mission.name}</h3>
                <span className={`chip chip-${mission.orbit_type}`}>{mission.orbit_type}</span>
                <span style={{ fontSize: 11, color: mission.launch_success ? "var(--green)" : "#f44336" }}>
                  {mission.launch_success ? "Successful" : "Failed"}
                </span>
              </div>
              <p className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                {mission.launch_date.slice(0, 10)} · {mission.payload_mass_kg.toLocaleString()} kg
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-dim)", flexShrink: 0 }}>
              <RotateCcw size={11} />
              <span style={{ fontSize: 10, color: "var(--text-dim)" }}>flip</span>
            </div>
          </div>

          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 14 }}>
            {mission.description}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
            <SubScore label="Orbital"  val={mission.score_orbital} />
            <SubScore label="Delta-V"  val={mission.score_delta_v} />
            <SubScore label="Weather"  val={mission.score_weather} />
          </div>
        </div>

        {/* ── Back ───────────────────────────────────────────────────────── */}
        <div className="card" style={{
          padding: 20, position: "absolute", inset: 0,
          backfaceVisibility: "hidden", transform: "rotateY(180deg)",
          background: "var(--surface)",
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--cyan)", marginBottom: 14 }}>Mission Details</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <DataRow label="Optimizer score" val={`${mission.optimizer_score}/100`} hi />
            <DataRow label="Delta-V"         val={`${mission.delta_v_ms.toLocaleString()} m/s`} />
            <DataRow label="Payload"         val={`${mission.payload_mass_kg.toLocaleString()} kg`} />
            <DataRow label="Launch date"     val={mission.launch_date.slice(0, 10)} />
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
              Actual weather on launch day
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{mission.actual_weather_desc}</p>
          </div>

          <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,193,7,0.05)", border: "1px solid rgba(255,193,7,0.15)", borderRadius: 7 }}>
            <p style={{ fontSize: 12, color: "#ffc107", lineHeight: 1.6, margin: 0 }}>{mission.fun_fact}</p>
          </div>

          <p style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "right", marginTop: 10 }}>Click to flip back</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DataRow({ label, val, hi }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      <span className="mono" style={{ fontSize: 12, fontWeight: hi ? 700 : 500, color: hi ? "var(--cyan)" : "var(--text)" }}>{val}</span>
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
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 13, padding: 40 }}>
      <div style={{ width: 18, height: 18, border: "2px solid var(--cyan)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      Loading historical data…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return <p className="mono" style={{ fontSize: 13, color: "#f44336", padding: 20 }}>{error}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>Historical Validation</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
          Real ISRO missions run retroactively through the optimizer. Orbital and delta-V calculations
          are physics-based and accurate. Click any card to reveal full details.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {missions.map((m, i) => <MissionCard key={m.name} mission={m} index={i} />)}
      </div>

      <div className="card" style={{ padding: "14px 18px" }}>
        <p className="section-label">Methodology note</p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
          Scores are computed by running the same orbital mechanics algorithm on the actual launch datetime.
          Weather scores for past dates use deterministic synthetic data (OpenWeatherMap free tier only
          provides 5-day forecasts). Orbital alignment and Δv calculations are fully accurate.
        </p>
      </div>
    </div>
  );
}
