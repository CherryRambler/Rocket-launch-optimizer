import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Wind, Droplets, Thermometer, Cloud, RefreshCw, Zap } from "lucide-react";
import { fetchCurrentWeather } from "../api";

const REFRESH_MS = 5 * 60 * 1000;

const RISK_STYLE = {
  GO:       { color: "var(--green)",  border: "rgba(0,230,118,0.2)",  bg: "rgba(0,230,118,0.04)"  },
  MARGINAL: { color: "#ffc107",       border: "rgba(255,193,7,0.2)",   bg: "rgba(255,193,7,0.04)"  },
  SCRUB:    { color: "#f44336",       border: "rgba(244,67,54,0.2)",   bg: "rgba(244,67,54,0.04)"  },
};

function MetricRow({ icon: Icon, label, value, unit, warn }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={13} color="var(--text-muted)" />
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      </div>
      <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: warn ? "#ffc107" : "var(--text)" }}>
        {value}<span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", marginLeft: 3 }}>{unit}</span>
      </span>
    </div>
  );
}

export default function WeatherRadar() {
  const [wx, setWx]       = useState(null);
  const [ts, setTs]       = useState(null);
  const [spin, setSpin]   = useState(false);
  const timer             = useRef(null);

  const load = async () => {
    setSpin(true);
    try {
      const d = await fetchCurrentWeather();
      setWx(d.current);
      setTs(new Date());
    } catch { /* keep stale */ }
    finally { setSpin(false); }
  };

  useEffect(() => {
    load();
    timer.current = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer.current);
  }, []);

  if (!wx) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "var(--text-muted)", fontSize: 13 }}>
        <RefreshCw size={14} className="animate-spin" style={{ marginRight: 8 }} /> Loading weather…
      </div>
    );
  }

  const risk  = wx.launch_risk_level || "MARGINAL";
  const style = RISK_STYLE[risk] || RISK_STYLE.MARGINAL;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Risk + temp header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="chip chip-mono" style={{
            display: "inline-block", padding: "3px 10px", borderRadius: 5,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
            color: style.color, border: `1px solid ${style.border}`, background: style.bg,
            fontFamily: "JetBrains Mono, monospace",
          }}>
            {risk}
          </span>
          <span className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
            {wx.temperature_c}°C
          </span>
        </div>

        {/* Cloud cover visual */}
        <div style={{ textAlign: "right" }}>
          <CloudBar pct={wx.cloud_cover_pct} />
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            {wx.cloud_cover_pct}% cloud cover
          </p>
        </div>
      </div>

      {/* Metric rows */}
      <div>
        <MetricRow icon={Wind}        label="Wind speed"    value={wx.wind_speed_ms}    unit="m/s"  warn={wx.wind_speed_ms > 12} />
        <MetricRow icon={Droplets}    label="Humidity"      value={wx.humidity_pct}     unit="%"    />
        <MetricRow icon={Cloud}       label="Precipitation" value={wx.precipitation_mm} unit="mm"   warn={wx.precipitation_mm > 1} />
        <MetricRow icon={Zap}         label="Lightning"     value={wx.lightning_risk ? "Risk detected" : "Clear"} unit=""  warn={wx.lightning_risk} />
      </div>

      {/* Weather score bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <span>Launch suitability</span>
          <span className="mono" style={{ color: style.color }}>{wx.weather_score}/100</span>
        </div>
        <div className="progress-track">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${wx.weather_score}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ height: "100%", background: style.color, borderRadius: 1 }}
          />
        </div>
      </div>

      {ts && (
        <p className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>
          Updated {ts.toLocaleTimeString()} · auto-refresh 5 min
          {spin && <RefreshCw size={10} className="animate-spin" style={{ marginLeft: 6, display: "inline" }} />}
        </p>
      )}
    </div>
  );
}

function CloudBar({ pct }) {
  const segs = 5;
  const filled = Math.round((pct / 100) * segs);
  return (
    <div style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
      {Array.from({ length: segs }).map((_, i) => (
        <div key={i} style={{
          width: 18, height: 6, borderRadius: 2,
          background: i < filled ? "#64748b" : "var(--border)",
          transition: "background 0.4s",
        }} />
      ))}
    </div>
  );
}
