import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Rocket, Wind, Globe, BarChart3, Zap, Shield, ArrowRight, Satellite, Activity, Calendar } from "lucide-react";

// ── All keyframes + special styles injected once ─────────────────────────────
const CSS = `
  @keyframes radar-sweep { to { transform: rotate(360deg); } }
  @keyframes lp-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes lp-ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes glitch-clip {
    0%,88%,100%  { clip-path:inset(0 0 100% 0); opacity:0; transform:none; }
    90%  { clip-path:inset(28% 0 52% 0); opacity:1; transform:translateX(-5px); }
    92%  { clip-path:inset(62% 0 18% 0); opacity:1; transform:translateX(5px); }
    94%  { clip-path:inset(8%  0 84% 0); opacity:1; transform:translateX(-2px); }
    96%  { clip-path:inset(0   0 100% 0); opacity:0; }
  }
  @keyframes blip-ring {
    0%,100%{ r:4; opacity:.8; }
    50%    { r:9; opacity:.2; }
  }
  @keyframes sweep-trail {
    0%   { opacity:.6; }
    100% { opacity:0;  }
  }
  .lp-root, .lp-root * { cursor: none !important; }
  .lp-hscroll { overflow-x:auto; scrollbar-width:none; scroll-snap-type:x mandatory; }
  .lp-hscroll::-webkit-scrollbar { display:none; }
`;

// ── Custom cursor reticle ────────────────────────────────────────────────────
function Reticle() {
  const el = useRef(null);
  const pos = useRef({ x: -200, y: -200 });
  const tgt = useRef({ x: -200, y: -200 });

  useEffect(() => {
    const mv = (e) => { tgt.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", mv);
    let raf;
    const tick = () => {
      pos.current.x += (tgt.current.x - pos.current.x) * 0.12;
      pos.current.y += (tgt.current.y - pos.current.y) * 0.12;
      if (el.current) el.current.style.transform = `translate(${pos.current.x - 30}px,${pos.current.y - 30}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener("mousemove", mv); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div ref={el} style={{ position: "fixed", top: 0, left: 0, zIndex: 9999, pointerEvents: "none", mixBlendMode: "screen" }}>
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(0,212,255,.4)" strokeWidth=".8" strokeDasharray="3 7" />
        <line x1="30" y1="2"  x2="30" y2="13" stroke="rgba(0,212,255,.8)" strokeWidth=".8" />
        <line x1="30" y1="47" x2="30" y2="58" stroke="rgba(0,212,255,.8)" strokeWidth=".8" />
        <line x1="2"  y1="30" x2="13" y2="30" stroke="rgba(0,212,255,.8)" strokeWidth=".8" />
        <line x1="47" y1="30" x2="58" y2="30" stroke="rgba(0,212,255,.8)" strokeWidth=".8" />
        <circle cx="30" cy="30" r="1.5" fill="rgba(0,212,255,.9)" />
        <path d="M17 4 L4 4 L4 17"  fill="none" stroke="rgba(0,212,255,.55)" strokeWidth=".9" />
        <path d="M43 4 L56 4 L56 17" fill="none" stroke="rgba(0,212,255,.55)" strokeWidth=".9" />
        <path d="M17 56 L4 56 L4 43" fill="none" stroke="rgba(0,212,255,.55)" strokeWidth=".9" />
        <path d="M43 56 L56 56 L56 43" fill="none" stroke="rgba(0,212,255,.55)" strokeWidth=".9" />
      </svg>
    </div>
  );
}

// ── Dot globe ────────────────────────────────────────────────────────────────
const SHAR_LAT = 13.72 * (Math.PI / 180);
const SHAR_LON = 80.23 * (Math.PI / 180);

function buildDots() {
  const dots = [];
  for (let latDeg = -80; latDeg <= 80; latDeg += 7) {
    const lat = latDeg * (Math.PI / 180);
    const count = Math.max(5, Math.round(28 * Math.cos(lat)));
    for (let i = 0; i < count; i++) {
      const lon = ((i / count) * 360 - 180) * (Math.PI / 180);
      const isSHAR = Math.abs(latDeg - 13.72) < 8 && Math.abs((i / count) * 360 - 180 - 80.23) < 10;
      dots.push({ lat, lon, isSHAR });
    }
  }
  return dots;
}
const GLOBE_DOTS = buildDots();

function DotGlobe({ size = 460 }) {
  const canvasRef = useRef(null);
  const angle = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const R = size * 0.43;
    const cx = size / 2, cy = size / 2;
    let raf;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const a = angle.current;

      // Equator line (faint)
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const t = (i / 120) * Math.PI * 2;
        const lam = t + a;
        const x = cx + R * Math.cos(lam);
        const y = cy;
        const z = R * Math.sin(lam);
        if (z < 0) continue;
        const alpha = (z / R) * 0.12;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(0,212,255,0.08)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Sort dots back→front
      const pts = GLOBE_DOTS.map(({ lat, lon, isSHAR }) => {
        const lam = lon + a;
        const x = R * Math.cos(lat) * Math.cos(lam);
        const y = R * Math.sin(lat);
        const z = R * Math.cos(lat) * Math.sin(lam);
        return { px: cx + x, py: cy - y, z, isSHAR };
      }).sort((a, b) => a.z - b.z);

      pts.forEach(({ px, py, z, isSHAR }) => {
        const depth = (z + R) / (2 * R);
        if (depth < 0.03) return;
        const opacity = 0.07 + depth * 0.72;
        const dotR = 0.65 + depth * 1.45;

        if (isSHAR && depth > 0.45) {
          // Sriharikota glow
          const g = ctx.createRadialGradient(px, py, 0, px, py, 12);
          g.addColorStop(0, `rgba(0,255,136,${opacity * 0.6})`);
          g.addColorStop(1, "rgba(0,255,136,0)");
          ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2);
          ctx.fillStyle = g; ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, dotR * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,136,${Math.min(1, opacity * 1.8)})`; ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(px, py, dotR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${isSHAR ? "0,255,136" : "0,195,230"},${opacity})`;
          ctx.fill();
        }
      });

      angle.current += 0.0035;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Ambient glow behind globe */}
      <div style={{
        position: "absolute", inset: "-20%",
        background: "radial-gradient(circle at 50% 50%, rgba(0,212,255,.1) 0%, rgba(0,212,255,.03) 45%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <canvas ref={canvasRef} width={size} height={size} style={{ display: "block", position: "relative" }} />

      {/* Orbit rings — SVG overlay */}
      <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* LEO ring — slight tilt */}
        <ellipse
          cx={size / 2} cy={size / 2}
          rx={size * 0.49} ry={size * 0.14}
          fill="none" stroke="rgba(0,212,255,.13)" strokeWidth="1"
          transform={`rotate(-22,${size / 2},${size / 2})`}
          strokeDasharray="4 6"
        />
        {/* SSO ring — steep tilt */}
        <ellipse
          cx={size / 2} cy={size / 2}
          rx={size * 0.49} ry={size * 0.09}
          fill="none" stroke="rgba(179,136,255,.12)" strokeWidth="1"
          transform={`rotate(55,${size / 2},${size / 2})`}
          strokeDasharray="3 8"
        />
        {/* Equatorial ring */}
        <ellipse
          cx={size / 2} cy={size / 2}
          rx={size * 0.49} ry={size * 0.055}
          fill="none" stroke="rgba(0,255,136,.09)" strokeWidth="1"
          transform={`rotate(0,${size / 2},${size / 2})`}
        />
        {/* Satellite dot on LEO ring */}
        <circle r="3" fill="#00d4ff" opacity=".8">
          <animateMotion dur="8s" repeatCount="indefinite">
            <mpath href="#leo-path" />
          </animateMotion>
        </circle>
        <path id="leo-path" d={`M ${size * 0.01} ${size / 2} a ${size * 0.49} ${size * 0.14} -22 1 0 ${size * 0.98} 0`} fill="none" />
        {/* Label */}
        <text x={size / 2 + size * 0.49 + 6} y={size / 2 + 3} fill="rgba(0,212,255,.35)" fontSize="7.5" fontFamily="JetBrains Mono,monospace">LEO</text>
        <text x="8" y={size - 8} fill="rgba(0,212,255,.28)" fontSize="7" fontFamily="JetBrains Mono,monospace">SRIHARIKOTA  13.72°N 80.23°E</text>
      </svg>
    </div>
  );
}

// ── Scrolling telemetry ticker ───────────────────────────────────────────────
const TICKS = [
  "WEATHER ✓ GO", "WIND SHEAR: 12 m/s", "ORBIT: LEO 520 km",
  "Δv: 9.41 km/s", "WINDOW: 06:42 IST", "PAYLOAD: 1850 kg",
  "ANOMALIES: NONE", "STATUS: NOMINAL", "AZIMUTH: 102.3°",
  "RANGE SAFETY: CLEAR", "FUEL MARGIN: +4.2%", "T-MINUS: CALC",
];
function Ticker() {
  const all = [...TICKS, ...TICKS];
  return (
    <div style={{ overflow: "hidden", borderTop: "1px solid rgba(0,212,255,.1)", borderBottom: "1px solid rgba(0,212,255,.1)", background: "rgba(0,0,0,.35)", backdropFilter: "blur(8px)", padding: "9px 0" }}>
      <div style={{ display: "flex", gap: 56, whiteSpace: "nowrap", animation: "lp-ticker 32s linear infinite" }}>
        {all.map((t, i) => (
          <span key={i} style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "rgba(0,212,255,.6)", letterSpacing: ".12em", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: "rgba(0,255,136,.45)", fontSize: 7 }}>◆</span>{t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── HUD corner brackets ──────────────────────────────────────────────────────
function Brackets({ c = "rgba(0,212,255,.35)", s = 13 }) {
  const base = { position: "absolute", width: s, height: s };
  const b = `1px solid ${c}`;
  return (
    <>
      <div style={{ ...base, top: -1, left: -1,  borderTop: b, borderLeft: b }} />
      <div style={{ ...base, top: -1, right: -1, borderTop: b, borderRight: b }} />
      <div style={{ ...base, bottom: -1, left: -1,  borderBottom: b, borderLeft: b }} />
      <div style={{ ...base, bottom: -1, right: -1, borderBottom: b, borderRight: b }} />
    </>
  );
}

// ── Mission clock ────────────────────────────────────────────────────────────
function MissionClock() {
  const [t, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT(n => n + 1), 1000); return () => clearInterval(id); }, []);
  const pad = n => String(n).padStart(2, "0");
  return (
    <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 11, color: "rgba(0,212,255,.55)", letterSpacing: ".1em" }}>
      MET T+{pad(Math.floor(t / 3600))}:{pad(Math.floor((t % 3600) / 60))}:{pad(t % 60)}
    </span>
  );
}

// ── Scroll reveal ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 24 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Section rule label ───────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
      <div style={{ width: 20, height: 1, background: "rgba(0,212,255,.5)" }} />
      <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "rgba(0,212,255,.65)", letterSpacing: ".2em" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right,rgba(0,212,255,.2),transparent)" }} />
    </div>
  );
}

// ── Signal stat ──────────────────────────────────────────────────────────────
function SignalStat({ label, value, suffix, pct, color = "#00d4ff", Icon }) {
  const [w, setW] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => setW(pct), 80); obs.disconnect(); }
    }, { threshold: .5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [pct]);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <Brackets c={`${color}40`} s={12} />
      <div style={{
        background: "rgba(10,15,30,0.6)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        padding: "32px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        boxShadow: `0 12px 40px rgba(0,0,0,0.4), inset 0 0 20px ${color}05`,
        overflow: "hidden"
      }}>
        {/* Glow background */}
        <div style={{ position: "absolute", top: "-20%", left: "-20%", width: "140%", height: "140%", background: `radial-gradient(circle at 50% 50%, ${color}08 0%, transparent 70%)`, pointerEvents: "none" }} />

        <div style={{ padding: 12, borderRadius: "50%", background: `${color}10`, border: `1px solid ${color}25`, marginBottom: 20, boxShadow: `0 0 20px ${color}15` }}>
          <Icon size={20} color={color} />
        </div>

        <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
          {label}
        </span>

        <div style={{ marginBottom: 24 }}>
          <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 48, fontWeight: 900, color: "var(--text)", lineHeight: 1, letterSpacing: "-0.02em" }}>
            {value}
          </span>
          <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 16, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>
            {suffix}
          </span>
        </div>

        {/* Segmented Progress Bar */}
        <div style={{ width: "100%", display: "flex", gap: 3, height: 4, marginBottom: 16 }}>
          {[...Array(20)].map((_, i) => {
            const isActive = (i / 19) * 100 <= w;
            return (
              <div key={i} style={{
                flex: 1,
                height: "100%",
                background: isActive ? color : "rgba(255,255,255,0.06)",
                borderRadius: 1,
                transition: `background 0.5s ${i * 0.05}s ease-out`,
                boxShadow: isActive ? `0 0 8px ${color}` : "none"
              }} />
            );
          })}
        </div>

        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", opacity: 0.3 }}>
           <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 8 }}>MIN_SPEC</span>
           <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 8 }}>OP_RNG</span>
           <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 8 }}>MAX_CAP</span>
        </div>
      </div>
    </div>
  );
}

// ── Dossier feature card ─────────────────────────────────────────────────────
const FILES = [
  { Icon: Wind,     title: "Live Weather Intelligence", desc: "Real-time meteorological fusion with upper-atmosphere wind models for go/no-go verdicts.", color: "#00d4ff", no: "001", lvl: "UNRESTRICTED" },
  { Icon: Globe,    title: "Orbital Alignment Engine",  desc: "Skyfield-powered ephemeris computing optimal azimuths for LEO, GEO, SSO down to 10-min resolution.", color: "#b388ff", no: "002", lvl: "MISSION USE" },
  { Icon: Zap,      title: "Δv Efficiency Scoring",     desc: "Payload-aware delta-V ranked against real propulsion constraints, not just time slots.", color: "#00ff88", no: "003", lvl: "TECHNICAL" },
  { Icon: BarChart3,title: "Multi-Window Analytics",    desc: "Score charts, heatmaps, and ranked tables for comparing hundreds of candidates instantly.", color: "#ffc107", no: "004", lvl: "ANALYST" },
  { Icon: Shield,   title: "Alert & Scrub System",      desc: "Threshold monitors flag marginal windows before they become pad-level scrubs.", color: "#ff6b6b", no: "005", lvl: "PRIORITY" },
  { Icon: Satellite,title: "3-D Orbit Visualizer",      desc: "Interactive globe renders spacecraft ground tracks in real time for coverage verification.", color: "#00d4ff", no: "006", lvl: "MISSION USE" },
];

function DossierCard({ Icon, title, desc, color, no, lvl }) {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: `0 20px 56px rgba(0,0,0,.4), 0 0 0 1px ${color}22` }}
      transition={{ duration: .2 }}
      style={{
        position: "relative",
        background: "rgba(8,12,28,0.52)",
        backdropFilter: "blur(40px) saturate(160%)",
        WebkitBackdropFilter: "blur(40px) saturate(160%)",
        border: "1px solid rgba(255,255,255,.1)",
        borderTop: "1px solid rgba(255,255,255,.18)",
        borderRadius: 20,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 12px 40px rgba(0,0,0,.3)",
        padding: "32px 28px 36px",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "rgba(255,255,255,.28)", letterSpacing: ".14em" }}>FILE-{no}</span>
        <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, padding: "3px 10px", borderRadius: 4, background: `${color}15`, border: `1px solid ${color}30`, color, letterSpacing: ".1em" }}>{lvl}</span>
      </div>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Icon size={22} color={color} />
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 12px", letterSpacing: "-.01em" }}>{title}</h3>
      <p style={{ fontSize: 14, color: "rgba(232,234,240,.5)", lineHeight: 1.75, margin: 0, flex: 1 }}>{desc}</p>
    </motion.div>
  );
}

// ── Launch sequence ──────────────────────────────────────────────────────────
const SEQ = [
  { t: "T-04:00:00", phase: "CONFIGURE", title: "Mission Parameters", desc: "Define orbit type, payload mass, and date range in the parameter interface." },
  { t: "T-03:00:00", phase: "ACQUIRE",   title: "Data Acquisition",   desc: "Live weather telemetry and Skyfield ephemeris retrieved and fused in parallel." },
  { t: "T-02:00:00", phase: "COMPUTE",   title: "Window Scoring",     desc: "All 10-min slots scored across weather, alignment, and Δv efficiency vectors." },
  { t: "T-00:00:00", phase: "EXECUTE",   title: "Launch Decision",    desc: "Top windows surfaced — compare, set alerts, and export the mission report." },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage({ onEnter }) {
  const { scrollY } = useScroll();
  const heroOp = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY  = useTransform(scrollY, [0, 400], [0, 60]);

  return (
    <div className="lp-root" style={{ position: "relative", color: "#e8eaf0", overflowX: "hidden" }}>
      <style>{CSS}</style>

      {/* ── Fixed: video + overlays ─────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <video autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }}>
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div style={{ position: "absolute", inset: 0, background: "rgba(6,10,20,.6)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 50% at 50% 48%, rgba(0,212,255,.055) 0%, transparent 70%)" }} />
      </div>

      {/* ── Fixed: CRT scanline ─────────────────────────────────────────── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.035) 3px,rgba(0,0,0,.035) 4px)",
      }} />

      {/* ── Custom cursor ───────────────────────────────────────────────── */}
      <Reticle />

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 3 }}>

        {/* ══ HERO ════════════════════════════════════════════════════════ */}
        <section style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "center",
            padding: "0 clamp(28px,5vw,100px)",
            gap: "clamp(40px,8vw,120px)",
            maxWidth: 1440, width: "100%",
            position: "relative", zIndex: 2
          }}>
            <motion.div style={{ opacity: heroOp, y: heroY, flex: "0 0 750px" }}>

              {/* Status row */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 20, background: "rgba(0,255,136,.06)", border: "1px solid rgba(0,255,136,.15)" }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#00ff88", display: "inline-block", animation: "lp-blink 1.1s step-end infinite" }} />
                  <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "#00ff88", letterSpacing: ".12em", fontWeight: 500 }}>SYSTEM STATUS: NOMINAL</span>
                </div>
                <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
                <MissionClock />
              </div>

              {/* Headline */}
              <div style={{ position: "relative", marginBottom: 32 }}>
                <h1 style={{ fontSize: "clamp(48px, 5.5vw, 82px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-.04em", margin: 0 }}>
                  Optimal launch windows
                  <br />
                  <span style={{ 
                    background: "linear-gradient(90deg, #00d4ff 0%, #b388ff 100%)", 
                    WebkitBackgroundClip: "text", 
                    WebkitTextFillColor: "transparent"
                  }}>
                    ranked for your mission.
                  </span>
                </h1>
              </div>

              <p style={{ fontSize: "clamp(15px,1.4vw,17px)", color: "rgba(232,234,240,.55)", maxWidth: 520, lineHeight: 1.7, margin: "0 0 44px", letterSpacing: "0.01em" }}>
                Weather intelligence meets high-fidelity orbital mechanics. 
                Our engine scores every 10-minute window so your team can 
                focus on the mission, not the math.
              </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <motion.button
                onClick={onEnter}
                whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(0,212,255,.4)" }}
                whileTap={{ scale: .97 }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "14px 30px", border: "none", borderRadius: 12,
                  background: "linear-gradient(135deg,#00d4ff,#0066ff)",
                  color: "#050816", fontWeight: 700, fontSize: 15,
                  letterSpacing: "-.01em",
                  boxShadow: "0 0 24px rgba(0,212,255,.28)",
                }}
              >
                <Rocket size={15} />
                Open the Optimizer
                <ArrowRight size={14} />
              </motion.button>

              <motion.button
                onClick={() => document.getElementById("capabilities")?.scrollIntoView({ behavior: "smooth" })}
                whileHover={{ borderColor: "rgba(0,212,255,.4)", color: "#e8eaf0" }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "14px 24px", borderRadius: 12,
                  background: "transparent", border: "1px solid rgba(255,255,255,.16)",
                  color: "rgba(232,234,240,.6)", fontWeight: 500, fontSize: 15,
                  letterSpacing: "-.01em",
                  transition: "border-color .2s,color .2s",
                }}
              >
                See how it works
              </motion.button>
            </div>

            {/* Coordinates */}
            <div style={{ marginTop: 38, display: "flex", gap: 20, fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,.18)", letterSpacing: ".08em" }}>
              <span>LAT 13.7199° N</span>
              <span>LON 80.2304° E</span>
              <span>ALT 14m MSL</span>
            </div>
          </motion.div>

          {/* Globe */}
          <motion.div
            initial={{ opacity: 0, scale: .88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: .5, ease: [.22, 1, .36, 1] }}
            style={{ flexShrink: 0 }}
          >
            <DotGlobe size={540} />
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          onClick={() => document.getElementById("capabilities")?.scrollIntoView({ behavior: "smooth" })}
          style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,.22)", zIndex: 2 }}
        >
          <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
            <rect x="1" y="1" width="18" height="26" rx="9" stroke="rgba(255,255,255,.2)" strokeWidth="1.2"/>
            <motion.rect x="8.5" y="5" width="3" height="6" rx="1.5" fill="rgba(0,212,255,.6)"
              animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} />
          </svg>
        </motion.div>
        </section>

        {/* ══ TICKER ══════════════════════════════════════════════════════ */}
        <Ticker />

        {/* ══ CAPABILITIES — 3-col vertical grid ═══════════════════════════ */}
        <section id="capabilities" style={{ padding: "112px clamp(32px,6vw,100px)" }}>
          <Reveal>
            <SectionLabel>CAPABILITY ASSESSMENT</SectionLabel>
            <h2 style={{ fontSize: "clamp(28px,4vw,54px)", fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 48px" }}>
              Mission-grade tools,{" "}
              <span style={{ color: "#00d4ff" }}>one interface.</span>
            </h2>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {FILES.map((f, i) => (
              <Reveal key={f.no} delay={i * .07}>
                <DossierCard {...f} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══ SYSTEM METRICS — signal readouts ════════════════════════════ */}
        <section style={{ padding: "112px clamp(32px,6vw,100px)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%", maxWidth: 1100 }}>
            <Reveal><SectionLabel>CORE SYSTEM METRICS</SectionLabel></Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginTop: 40 }}>
              {[
                { label: "WINDOW RESOLUTION", value: "10",  suffix: "min",   pct: 85, color: "#00d4ff", Icon: Activity },
                { label: "SCORING ACCURACY",  value: "99",  suffix: "%",     pct: 99, color: "#00ff88", Icon: Zap },
                { label: "ORBIT PROFILES",    value: "3",   suffix: "types", pct: 60, color: "#b388ff", Icon: Globe },
                { label: "FORECAST HORIZON",  value: "21",  suffix: "days",  pct: 72, color: "#ffc107", Icon: Calendar },
              ].map((s, i) => (
                <Reveal key={s.label} delay={i * .09}><SignalStat {...s} /></Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══ LAUNCH SEQUENCE ═════════════════════════════════════════════ */}
        <section style={{ padding: "112px clamp(32px,6vw,100px)" }}>
          <Reveal>
            <SectionLabel>LAUNCH SEQUENCE</SectionLabel>
            <h2 style={{ fontSize: "clamp(28px,4vw,54px)", fontWeight: 800, letterSpacing: "-.03em", margin: "0 0 56px" }}>
              From config to{" "}
              <span style={{ color: "#00ff88" }}>GO.</span>
            </h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 4 }}>
            {SEQ.map(({ t, phase, title, desc }, i) => (
              <Reveal key={t} delay={i * .09}>
                <motion.div
                  whileHover={{ background: "rgba(12,18,38,0.65)" }}
                  style={{
                    position: "relative", padding: "36px 30px",
                    minHeight: 220,
                    background: "rgba(8,12,28,0.52)",
                    backdropFilter: "blur(40px) saturate(160%)",
                    WebkitBackdropFilter: "blur(40px) saturate(160%)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderTop: "1px solid rgba(255,255,255,.18)",
                    borderRadius: 18,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 12px 40px rgba(0,0,0,.28)",
                    transition: "background .2s",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  <Brackets c="rgba(0,212,255,.3)" s={12} />
                  <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "rgba(0,212,255,.5)", letterSpacing: ".14em", marginBottom: 10 }}>{t}</div>
                  <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, display: "inline-block", padding: "3px 10px", background: "rgba(0,255,136,.07)", border: "1px solid rgba(0,255,136,.18)", color: "#00ff88", letterSpacing: ".1em", marginBottom: 22, alignSelf: "flex-start" }}>{phase}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", letterSpacing: "-.01em" }}>{title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(232,234,240,.5)", lineHeight: 1.75, margin: 0, flex: 1 }}>{desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══ TERMINAL CTA ════════════════════════════════════════════════ */}
        <section style={{ padding: "112px clamp(32px,6vw,100px) 112px" }}>
          <Reveal>
            <div style={{ maxWidth: 820, margin: "0 auto", position: "relative" }}>
              <Brackets c="rgba(0,212,255,.5)" s={18} />
              <div style={{
                background: "rgba(8,12,28,0.58)",
                backdropFilter: "blur(48px) saturate(180%)",
                WebkitBackdropFilter: "blur(48px) saturate(180%)",
                border: "1px solid rgba(255,255,255,.1)",
                borderTop: "1px solid rgba(255,255,255,.2)",
                borderRadius: 20,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.1), 0 20px 60px rgba(0,0,0,.4)",
                overflow: "hidden",
              }}>

                {/* Terminal title bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 24px", background: "rgba(255,255,255,.05)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                  {["#ff5f56","#ffbd2e","#27c93f"].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, opacity: .7 }} />)}
                  <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 11, color: "rgba(255,255,255,.25)", marginLeft: 8, letterSpacing: ".07em" }}>mission-control — bash — 80×24</span>
                </div>

                {/* Terminal body */}
                <div style={{ padding: "36px 36px 32px", fontFamily: "JetBrains Mono,monospace" }}>
                  {[
                    { p: "$ ", t: "authenticate --clearance=MISSION_CONTROLLER", c: "rgba(232,234,240,.8)" },
                    { p: "> ", t: "Verifying credentials...", c: "rgba(0,212,255,.55)" },
                    { p: "> ", t: "Access confirmed: FULL MISSION SUITE", c: "#00ff88" },
                    { p: "> ", t: "3 launch windows available. Ready.", c: "#00ff88" },
                    { p: "$ ", t: "▋", c: "rgba(0,212,255,.8)", blink: true },
                  ].map(({ p, t, c, blink }, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14, color: c }}>
                      <span style={{ color: "rgba(0,212,255,.4)", flexShrink: 0 }}>{p}</span>
                      <span style={blink ? { animation: "lp-blink 1s step-end infinite" } : {}}>{t}</span>
                    </div>
                  ))}

                  <motion.button
                    onClick={onEnter}
                    whileHover={{ scale: 1.015, boxShadow: "0 0 40px rgba(0,212,255,.35)" }}
                    whileTap={{ scale: .98 }}
                    style={{
                      marginTop: 32, width: "100%", padding: "16px 0",
                      background: "rgba(0,212,255,.09)", border: "1px solid rgba(0,212,255,.32)",
                      borderTop: "1px solid rgba(0,212,255,.5)",
                      color: "#00d4ff", fontFamily: "JetBrains Mono,monospace",
                      fontSize: 14, fontWeight: 700, letterSpacing: ".12em",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      transition: "box-shadow .2s",
                      boxShadow: "inset 0 1px 0 rgba(0,212,255,.15)",
                    }}
                  >
                    <Rocket size={13} />
                    ENTER MISSION CONTROL
                    <ArrowRight size={13} />
                  </motion.button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
        <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "22px clamp(28px,6vw,100px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 22, height: 22, background: "linear-gradient(135deg,#00d4ff,#0066ff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Rocket size={11} color="#050816" />
            </div>
            <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 12, fontWeight: 600, color: "rgba(232,234,240,.5)", letterSpacing: ".06em" }}>LAUNCH OPTIMIZER</span>
          </div>
          <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(232,234,240,.2)", letterSpacing: ".07em" }}>
            SDSC SHAR · 13.7°N 80.2°E · OWM + SKYFIELD
          </span>
        </footer>
      </div>
    </div>
  );
}
