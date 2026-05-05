import { useRef, useMemo, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

// Convert geographic (lat°, lon°) to XYZ at radius r
function geo2xyz(latDeg, lonDeg, r = 2.05) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(lat) * Math.cos(lon),
    r * Math.sin(lat),
    r * Math.cos(lat) * Math.sin(lon)
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Earth({ isMobile }) {
  const meshRef = useRef();
  const segments = isMobile ? 32 : 64;

  const [dayTex, nightTex] = useLoader(THREE.TextureLoader, [
    "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
    "https://threejs.org/examples/textures/planets/earth_lights_2048.png",
  ]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap:   { value: dayTex },
          nightMap: { value: nightTex },
          sunDir:   { value: new THREE.Vector3(5, 3, 5) },
        },
        vertexShader:   EARTH_VS,
        fragmentShader: EARTH_FS,
      }),
    [dayTex, nightTex]
  );

  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.0008;
  });

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[2, segments, segments]} />
    </mesh>
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

function OrbitRing({ orbitType }) {
  const ringRef = useRef();

  // Different inclination per orbit type
  const inclination = useMemo(() => {
    if (orbitType === "SSO") return Math.PI / 2 + 0.17; // ~98°
    if (orbitType === "GEO") return 0;
    return Math.PI / 3; // LEO ~51°
  }, [orbitType]);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = clock.getElapsedTime();
      ringRef.current.material.opacity = 0.28 + 0.28 * Math.sin(t * 1.8);
    }
  });

  return (
    <mesh ref={ringRef} rotation={[inclination, 0, 0.1]}>
      <torusGeometry args={[3.2, 0.018, 16, 180]} />
      <meshBasicMaterial color="#00d4ff" transparent opacity={0.4} />
    </mesh>
  );
}

function LaunchTrajectory({ active, orbitType }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    if (!active) return;
    let p = 0;
    const id = setInterval(() => {
      p = Math.min(1, p + 0.018);
      setProgress(p);
      if (p >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [active, orbitType]);

  // Sriharikota: 13.9°N 80.4°E, heading NE for typical PSLV
  const curve = useMemo(() => {
    const p0 = geo2xyz(13.9, 80.4, 2.05);
    const p1 = geo2xyz(20,   86,   2.5);
    const p2 = geo2xyz(30,   95,   3.0);
    const p3 = geo2xyz(38,  105,   3.2);
    return new THREE.CubicBezierCurve3(p0, p1, p2, p3);
  }, []);

  const points = useMemo(() => {
    const n = Math.max(2, Math.ceil(60 * progress));
    return curve.getPoints(n);
  }, [curve, progress]);

  if (progress < 0.01) return null;

  return (
    <Line
      points={points}
      color="#00ff88"
      lineWidth={2.5}
      transparent
      opacity={0.9}
    />
  );
}

function LaunchSite() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + 0.3 * Math.abs(Math.sin(clock.getElapsedTime() * 3));
      ref.current.scale.setScalar(s);
    }
  });

  const pos = useMemo(() => geo2xyz(13.9, 80.4, 2.06), []);

  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[0.025, 8, 8]} />
      <meshBasicMaterial color="#ff4444" />
    </mesh>
  );
}

// ── Scene with fallback ────────────────────────────────────────────────────────

function EarthWithFallback({ isMobile, selectedWindow, orbitType }) {
  return (
    <Suspense fallback={null}>
      <Earth isMobile={isMobile} />
      <AtmosphericGlow isMobile={isMobile} />
      <OrbitRing orbitType={orbitType} />
      <LaunchTrajectory active={!!selectedWindow} orbitType={orbitType} />
      <LaunchSite />
    </Suspense>
  );
}

// ── Exported canvas wrapper ────────────────────────────────────────────────────

export default function EarthScene({ selectedWindow, orbitType = "LEO" }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <Canvas
      camera={{ position: [0, 1, 6], fov: 45 }}
      gl={{ antialias: !isMobile, alpha: true }}
      style={{ background: "transparent" }}
      dpr={isMobile ? 1 : Math.min(window.devicePixelRatio, 2)}
    >
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#fff8e1" />

      <EarthWithFallback
        isMobile={isMobile}
        selectedWindow={selectedWindow}
        orbitType={orbitType}
      />

      <OrbitControls
        enablePan={false}
        minDistance={3.5}
        maxDistance={9}
        autoRotate={!selectedWindow}
        autoRotateSpeed={0.4}
        enableDamping
        dampingFactor={0.06}
      />
    </Canvas>
  );
}
