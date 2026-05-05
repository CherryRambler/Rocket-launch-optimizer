import { motion, AnimatePresence } from "framer-motion";

function Bar({ pct, error }) {
  const filled = Math.round((pct / 100) * 12);
  return (
    <span className="mono" style={{ color: error ? "#f44336" : "var(--cyan)", fontSize: 12 }}>
      [{"█".repeat(filled)}{"░".repeat(12 - filled)}]{" "}
      <span style={{ color: "var(--text-muted)" }}>{pct}%</span>
    </span>
  );
}

export default function CalculationFeed({ lines, loading, error }) {
  return (
    <div className="card terminal" style={{ padding: "16px 20px" }}>
      <p className="section-label">Calculation Log</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minHeight: 72 }}>
        <AnimatePresence>
          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", alignItems: "center", gap: 12, color: line.pct === 0 ? "#f44336" : "var(--text-muted)" }}
            >
              <Bar pct={line.pct} error={line.pct === 0} />
              <span style={{ fontSize: 12 }}>{line.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && lines.length === 0 && (
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{ fontSize: 12, color: "var(--cyan)" }}
          >
            Initialising…
          </motion.span>
        )}

        {!loading && lines.length > 0 && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ fontSize: 12, color: "var(--green)", marginTop: 4 }}>
            Process complete
          </motion.div>
        )}
      </div>
    </div>
  );
}
