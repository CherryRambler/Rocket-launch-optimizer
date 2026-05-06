import { useRef, useMemo, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Line, Stars, Float, Html } from "@react-three/drei";
import * as THREE from "three";
import { useApp, LAUNCH_SITES } from "../context/AppContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

function geo2xyz(latDeg, lonDeg, r = 2) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180 + Math.PI;
  return new THREE.Vector3(
    -r * Math.cos(lat) * Math.cos(lon),
    r * Math.sin(lat),
    r * Math.cos(lat) * Math.sin(lon)
  );
}

// ── Shaders ───────────────────────────────────────────────────────────────────

const EARTH_VS = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EARTH_FS = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    float cosA = dot(normalize(vWorldNormal), normalize(sunDir));
    float blend = smoothstep(-0.18, 0.18, cosA);
    vec4 day   = texture2D(dayMap, vUv);
    vec4 night = texture2D(nightMap, vUv);
    gl_FragColor = mix(night * 0.9, day, blend);
  }
`;

const GLOW_VS = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const GLOW_FS = `
  uniform vec3 glowColor;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float intensity = pow(0.72 - dot(vNormal, vViewDir), 3.2);
    gl_FragColor = vec4(glowColor * intensity, intensity * 0.75);
  }
`;

// ── Astronomical Sync ─────────────────────────────────────────────────────────

function getSunDirection() {
  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const lonRad = -(hours - 12) * (Math.PI / 12);
  return new THREE.Vector3(Math.cos(lonRad), 0.3, Math.sin(lonRad)).normalize();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Earth({ isMobile, sunDir }) {
  const cloudsRef = useRef();
  const segments = isMobile ? 32 : 64;

  const [dayTex, nightTex, cloudTex] = useLoader(THREE.TextureLoader, [
    "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
    "https://threejs.org/examples/textures/planets/earth_lights_2048.png",
    "https://threejs.org/examples/textures/planets/earth_clouds_1024.png",
  ]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap:   { value: dayTex },
          nightMap: { value: nightTex },
          sunDir:   { value: sunDir },
        },
        vertexShader:   EARTH_VS,
        fragmentShader: EARTH_FS,
      }),
    [dayTex, nightTex]
  );

  useEffect(() => {
    material.uniforms.sunDir.value = sunDir;
  }, [sunDir, material]);

  useFrame(() => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0001;
  });

  return (
    <group>
      <mesh material={material}>
        <sphereGeometry args={[2, segments, segments]} />
      </mesh>
      <mesh ref={cloudsRef} rotation={[0, 0.5, 0]}>
        <sphereGeometry args={[2.02, segments, segments]} />
        <meshStandardMaterial map={cloudTex} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function AtmosphericGlow({ isMobile }) {
  const segments = isMobile ? 32 : 64;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { glowColor: { value: new THREE.Color(0x00d4ff) } },
        vertexShader:   GLOW_VS,
        fragmentShader: GLOW_FS,
        side:           THREE.FrontSide,
        blending:       THREE.AdditiveBlending,
        transparent:    true,
        depthWrite:     false,
      }),
    []
  );

  return (
    <mesh material={mat}>
      <sphereGeometry args={[2.18, segments, segments]} />
    </mesh>
  );
}

function RocketExhaust({ position, rotation }) {
  const meshRef = useRef();
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + 0.2 * Math.sin(clock.getElapsedTime() * 20));
      meshRef.current.material.opacity = 0.4 + 0.2 * Math.cos(clock.getElapsedTime() * 15);
    }
  });
  return (
    <group position={position} rotation={rotation}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.01, 0.05, 0.2, 12]} />
        <meshBasicMaterial color="#ff6600" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight color="#ff8800" intensity={0.8} distance={0.5} />
    </group>
  );
}

function MissionTelemetry({ altitude, velocity, stage, score, constraints }) {
  return (
    <Html position={[-2.2, 2.2, 0]} center={false}>
      <div style={{
        padding: "14px", background: "rgba(5, 10, 25, 0.9)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(0, 212, 255, 0.25)", borderRadius: 12, minWidth: 200,
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)", pointerEvents: "none"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: "var(--cyan)", letterSpacing: "0.15em" }}>FLIGHT_DATA_LINK</span>
            <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)" }}>ENCRYPTED_UDP_STREAM</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: score > 0.7 ? "#00ff88" : "#ffcc00" }}>{Math.round(score * 100)}%</span>
            <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.5)" }}>SUCCESS_PROB</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><p style={{ margin: 0, fontSize: 8, color: "rgba(255,255,255,0.4)" }}>ALTITUDE</p><p className="mono" style={{ margin: 0, fontSize: 16, color: "#fff", fontWeight: 700 }}>{altitude.toLocaleString()}<span style={{ fontSize: 9, opacity: 0.5 }}>KM</span></p></div>
          <div><p style={{ margin: 0, fontSize: 8, color: "rgba(255,255,255,0.4)" }}>VELOCITY</p><p className="mono" style={{ margin: 0, fontSize: 16, color: "#00ff88", fontWeight: 700 }}>{velocity}<span style={{ fontSize: 9, opacity: 0.5 }}>KM/S</span></p></div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
          <p style={{ margin: "0 0 6px 0", fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>SYSTEM_CONSTRAINTS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Object.entries(constraints).map(([key, val]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.6)" }}>{key}</span>
                <span style={{ fontSize: 8, color: val ? "#00ff88" : "#ff4444", fontWeight: 800 }}>{val ? "PASSED" : "FAILED"}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12, padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 4, textAlign: "center" }}><span style={{ fontSize: 9, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>{stage}</span></div>
      </div>
    </Html>
  );
}

function MissionSimulation({ active, selectedSite, orbitType, onComplete, selectedWindow }) {
  const [progress, setProgress] = useState(0);
  const [telemetry, setTelemetry] = useState({ alt: 0, vel: 0, stage: "INITIATING" });

  const constraints = useMemo(() => {
    if (!selectedWindow) return { WEATHER: true, ALIGNMENT: true, FUEL: true };
    return {
      WEATHER: selectedWindow.score_weather >= 60 && selectedWindow.lightning_risk === false,
      ALIGNMENT: selectedWindow.score_orbital >= 60,
      FUEL: selectedWindow.score_delta_v >= 55,
      WIND_GUST: (selectedWindow.wind_gust_ms ?? selectedWindow.wind_speed_ms) <= 15,
      PRESSURE: (selectedWindow.pressure_hpa ?? 1013) >= 995 && (selectedWindow.pressure_hpa ?? 1013) <= 1025,
      MAX_Q: true,
    };
  }, [selectedWindow]);

  useEffect(() => {
    if (!active) { setProgress(0); return; }
    let p = 0;
    const interval = setInterval(() => {
      p += 0.003; 
      if (p > 1) { p = 1; clearInterval(interval); if (onComplete) onComplete(); }
      setProgress(p);
      let stage = "IGNITION & LIFTOFF";
      if (p > 0.1) stage = "MAX-Q / GRAVITY TURN";
      if (p > 0.4) stage = "STAGE 1 SEPARATION";
      if (p > 0.7) stage = "SECO (ENGINE CUTOFF)";
      if (p >= 1) stage = "ORBITAL DEPLOYMENT";
      const targetAlt = orbitType === "GEO" ? 35786 : 500;
      const targetVel = orbitType === "GEO" ? 3.07 : 7.8;
      setTelemetry({ alt: Math.round(p * targetAlt), vel: (p * targetVel).toFixed(2), stage });
    }, 32);
    return () => clearInterval(interval);
  }, [active, orbitType, onComplete]);

  const curve = useMemo(() => {
    if (!selectedSite) return null;
    const p0 = geo2xyz(selectedSite.lat, selectedSite.lon, 2.0);
    
    // Calculate surface normal at the launch site to define vertical ascent
    const normal = p0.clone().normalize();
    
    // Vertical climb to clear lower atmosphere (p1)
    const p1 = p0.clone().add(normal.clone().multiplyScalar(0.2)); 
    
    // Pitch over and accelerate (p2) - shift radius out significantly
    const p2 = p1.clone().add(normal.clone().multiplyScalar(0.6))
               .add(new THREE.Vector3(0.5, 0.2, 0.5)); // Added horizontal offset
    
    // Target orbital insertion point (p3)
    const inclination = orbitType === "SSO" ? Math.PI / 2 + 0.17 : (orbitType === "GEO" ? 0 : Math.PI / 3);
    const p3 = new THREE.Vector3(3.2, 0, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), inclination);
    
    return new THREE.CubicBezierCurve3(p0, p1, p2, p3);
  }, [selectedSite, orbitType]);

  if (!active || !curve || progress < 0.001) return null;
  const currentPos = curve.getPoint(progress);
  const points = curve.getPoints(Math.max(2, Math.ceil(100 * progress)));

  return (
    <group>
      <Line points={points} color={constraints.ALIGNMENT ? "#00ff88" : "#ffcc00"} lineWidth={1.5} transparent opacity={0.4} />
      {progress < 1 && (
        <group position={currentPos}>
          <mesh><sphereGeometry args={[0.02, 12, 12]} /><meshBasicMaterial color="#fff" /></mesh>
          {progress < 0.8 && <RocketExhaust position={[0, -0.05, 0]} rotation={[0, 0, 0]} />}
        </group>
      )}
      <MissionTelemetry altitude={telemetry.alt} velocity={telemetry.vel} stage={telemetry.stage} score={(selectedWindow?.score_total ?? 100) / 100} constraints={constraints} />
    </group>
  );
}

function OrbitSystem({ orbitType, isDeployed, orbitData }) {
  const ringRef = useRef();
  const satRef = useRef();
  const phaseOffsetRef = useRef(Math.random() * 1000);
  const inclination = useMemo(() => {
    if (orbitType === "SSO") return Math.PI / 2 + 0.17;
    if (orbitType === "GEO") return 0;
    return Math.PI / 3;
  }, [orbitType]);
  const orbitLinePoints = useMemo(() => {
    const altitudeKm = orbitData?.altitude_km ?? (orbitType === "GEO" ? 35786 : orbitType === "SSO" ? 600 : 500);
    const inclinationDeg = orbitData?.inclination_deg ?? (orbitType === "SSO" ? 97.8 : orbitType === "GEO" ? 0 : 20);
    const radius = 2 * (1 + altitudeKm / 6371);
    const inc = (inclinationDeg * Math.PI) / 180;
    const points = [];
    const n = 360;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = radius * Math.cos(a);
      const y = radius * Math.sin(a) * Math.sin(inc);
      const z = radius * Math.sin(a) * Math.cos(inc);
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  }, [orbitData, orbitType]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) ringRef.current.material.opacity = isDeployed ? 0.4 : 0.15;
    if (satRef.current && isDeployed && orbitLinePoints.length > 1) {
      const cycleSec = (orbitData?.period_minutes ?? 90) * 60;
      const frac = (((t + phaseOffsetRef.current) % cycleSec) / cycleSec);
      const idx = Math.floor(frac * orbitLinePoints.length) % orbitLinePoints.length;
      const pos = orbitLinePoints[idx];
      satRef.current.position.copy(pos);
      const next = orbitLinePoints[(idx + 1) % orbitLinePoints.length];
      satRef.current.lookAt(next);
    }
  });

  return (
    <group rotation={orbitLinePoints.length ? [0, 0, 0] : [inclination, 0, 0.1]}>
      {orbitLinePoints.length ? (
        <Line points={orbitLinePoints} color="#00d4ff" lineWidth={1.4} transparent opacity={isDeployed ? 0.45 : 0.18} />
      ) : (
        <mesh ref={ringRef}><torusGeometry args={[3.2, 0.01, 16, 120]} /><meshBasicMaterial color="#00d4ff" transparent opacity={0.15} /></mesh>
      )}
      {isDeployed && (
        <group ref={satRef}>
          <mesh><sphereGeometry args={[0.04, 12, 12]} /><meshBasicMaterial color="#00d4ff" /></mesh>
          <mesh scale={[2, 2, 2]}><sphereGeometry args={[0.06, 12, 12]} /><meshBasicMaterial color="#00d4ff" transparent opacity={0.2} /></mesh>
          <pointLight color="#00d4ff" intensity={0.5} distance={1} />
        </group>
      )}
    </group>
  );
}

function LaunchSites() {
  const { selectedSite, setSelectedSite } = useApp();
  const [hovered, setHovered] = useState(null);
  return (
    <group>
      {LAUNCH_SITES.map((site) => {
        const isSelected = selectedSite?.id === site.id;
        const pos = geo2xyz(site.lat, site.lon, 2.0);
        return (
          <group key={site.id} position={pos}>
            <Float speed={isSelected ? 5 : 2} rotationIntensity={0} floatIntensity={0.5}>
              <mesh onClick={(e) => { e.stopPropagation(); setSelectedSite(site); }} onPointerOver={() => setHovered(site.id)} onPointerOut={() => setHovered(null)} >
                <sphereGeometry args={[0.045, 12, 12]} /><meshBasicMaterial color={isSelected ? "#00f2ff" : "#ff4444"} />
              </mesh>
              {(isSelected || hovered === site.id) && (
                <mesh rotation={[Math.PI / 2, 0, 0]}><ringGeometry args={[0.07, 0.1, 32]} /><meshBasicMaterial color={isSelected ? "#00f2ff" : "#ff4444"} transparent opacity={0.5} /></mesh>
              )}
            </Float>
            {(isSelected || hovered === site.id) && (
              <Html distanceFactor={12} position={[0.1, 0.1, 0]} center={false}>
                <div style={{ padding: "4px 8px", whiteSpace: "nowrap", pointerEvents: "none", background: "rgba(5, 8, 12, 0.92)", backdropFilter: "blur(16px)", border: `1px solid ${isSelected ? "#00f2ff" : "rgba(255,255,255,0.1)"}`, borderLeft: `3px solid ${isSelected ? "#00f2ff" : "#ff4444"}`, borderRadius: "2px 8px 8px 2px", boxShadow: "10px 10px 30px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", gap: 0, transform: "translate(15px, -80%)", minWidth: "100px", transition: "all 0.3s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}><span style={{ fontSize: 9, fontWeight: 900, color: isSelected ? "#00f2ff" : "#fff", textTransform: "uppercase", letterSpacing: "0.1em" }}>{site.id}</span><span style={{ fontSize: 7, color: isSelected ? "#00f2ff" : "#ff4444", fontWeight: 700 }}>{isSelected ? "ACTIVE" : "READY"}</span></div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{site.name}</p>
                  <p style={{ margin: 0, fontSize: 8, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{site.location}</p>
                  <div style={{ display: "flex", gap: 6, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 3 }}><div style={{ display: "flex", gap: 2, alignItems: "baseline" }}><span style={{ fontSize: 6, color: "rgba(255,255,255,0.3)" }}>LAT</span><span style={{ fontSize: 8, color: "#00f2ff", fontFamily: "monospace" }}>{site.lat.toFixed(1)}°</span></div><div style={{ display: "flex", gap: 2, alignItems: "baseline" }}><span style={{ fontSize: 6, color: "rgba(255,255,255,0.3)" }}>LON</span><span style={{ fontSize: 8, color: "#00f2ff", fontFamily: "monospace" }}>{site.lon.toFixed(1)}°</span></div></div>
                </div>
              </Html>
            )}
            {isSelected && <pointLight color="#00f2ff" intensity={0.5} distance={1} />}
          </group>
        );
      })}
    </group>
  );
}

// ── Scene Wrapper ─────────────────────────────────────────────────────────────

function EarthWithFallback({ isMobile, selectedWindow, orbitType, sunDir, selectedSite }) {
  const { orbitData } = useApp();
  const surfaceGroupRef = useRef();
  const [isDeployed, setIsDeployed] = useState(false);
  useEffect(() => { setIsDeployed(false); }, [orbitType, selectedSite]);
  useFrame(() => { if (surfaceGroupRef.current) surfaceGroupRef.current.rotation.y += 0.00015; });
  return (
    <Suspense fallback={null}>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <group ref={surfaceGroupRef}>
        <Earth isMobile={isMobile} sunDir={sunDir} />
        <MissionSimulation active={!!selectedWindow} selectedSite={selectedSite} orbitType={orbitType} onComplete={() => setIsDeployed(true)} selectedWindow={selectedWindow} />
        <LaunchSites />
      </group>
      <AtmosphericGlow isMobile={isMobile} />
      <OrbitSystem orbitType={orbitType} isDeployed={isDeployed} orbitData={orbitData} />
    </Suspense>
  );
}

export default function EarthScene({ selectedWindow, orbitType = "LEO" }) {
  const { selectedSite } = useApp();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const [sunDir, setSunDir] = useState(() => getSunDirection());
  useEffect(() => { const id = setInterval(() => setSunDir(getSunDirection()), 60000); return () => clearInterval(id); }, []);
  const lightPos = useMemo(() => sunDir.clone().multiplyScalar(10), [sunDir]);
  return (
    <Canvas camera={{ position: [0, 1.5, 6], fov: 45 }} gl={{ antialias: !isMobile, alpha: true }} style={{ background: "transparent" }}>
      <ambientLight intensity={0.25} />
      <directionalLight position={lightPos} intensity={1.8} color="#fff8e1" />
      <EarthWithFallback isMobile={isMobile} selectedWindow={selectedWindow} orbitType={orbitType} sunDir={sunDir} selectedSite={selectedSite} />
      <OrbitControls enablePan={false} minDistance={3.5} maxDistance={10} autoRotate={!selectedWindow} autoRotateSpeed={0.2} enableDamping dampingFactor={0.08} />
    </Canvas>
  );
}
