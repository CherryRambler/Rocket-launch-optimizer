import { useEffect, useRef } from "react";

const ORBIT_COLORS = {
  LEO: "#00c8ff",
  GEO: "#b47fff",
  SSO: "#00ffb2",
};

const ORBIT_LABEL = {
  LEO: "Low Earth Orbit — 500 km",
  GEO: "Geostationary Orbit — 35,786 km",
  SSO: "Sun-Synchronous Orbit — 600 km",
};

// Launch site coordinates (Sriharikota)
const SHAR_LAT = 13.7199;
const SHAR_LON = 80.2304;

export default function OrbitViewer({ orbitData }) {
  const cesiumReady = useRef(false);
  const viewerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Dynamically import Cesium so it doesn't block initial load
    let viewer = null;
    let cancelled = false;

    async function initCesium() {
      try {
        const Cesium = await import("cesium");
        await import("cesium/Build/Cesium/Widgets/widgets.css");

        // Use a free Cesium Ion token for basic terrain — user can set their own
        Cesium.Ion.defaultAccessToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1iOGI3MDkxOWQ2MjciLCJpZCI6NTc3MzMsImlhdCI6MTYyMjY0NDA5N30.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk";

        if (cancelled || !containerRef.current) return;

        viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          terrainProvider: await Cesium.createWorldTerrainAsync().catch(() => undefined),
        });

        viewerRef.current = viewer;
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#050816");

        // Add launch site marker
        viewer.entities.add({
          name: "SDSC SHAR — Sriharikota",
          position: Cesium.Cartesian3.fromDegrees(SHAR_LON, SHAR_LAT, 0),
          point: {
            pixelSize: 12,
            color: Cesium.Color.ORANGE,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
          label: {
            text: "🚀 SDSC SHAR",
            font: "13px monospace",
            fillColor: Cesium.Color.ORANGE,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
          },
        });

        // Draw simplified orbit ellipse using sampled positions from CZML
        if (orbitData?.cesium_czml?.position?.cartesian) {
          const color = Cesium.Color.fromCssColorString(
            ORBIT_COLORS[orbitData.orbit_type] || "#00c8ff"
          );
          const positions = [];
          const raw = orbitData.cesium_czml.position.cartesian;
          // raw is [t, x, y, z, t, x, y, z, ...] — extract xyz
          for (let i = 0; i < raw.length; i += 4) {
            positions.push(new Cesium.Cartesian3(raw[i + 1], raw[i + 2], raw[i + 3]));
          }

          viewer.entities.add({
            name: `${orbitData.orbit_type} Orbit Path`,
            polyline: {
              positions,
              width: 2,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.3,
                color,
              }),
              arcType: Cesium.ArcType.NONE,
            },
          });
        }

        // Zoom to show full Earth with orbit
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(SHAR_LON, 10, 12_000_000),
        });

        cesiumReady.current = true;
      } catch (err) {
        console.error("Cesium init failed:", err);
      }
    }

    initCesium();

    return () => {
      cancelled = true;
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  }, [orbitData]);

  const orbitType = orbitData?.orbit_type || "LEO";
  const color = ORBIT_COLORS[orbitType];

  return (
    <div className="space-y-3">
      {/* Orbit info bar */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ background: color }}
        />
        <span className="text-slate-300">{ORBIT_LABEL[orbitType]}</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Altitude: {orbitData?.altitude_km?.toLocaleString()} km</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Inclination: {orbitData?.inclination_deg}°</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Period: {orbitData?.period_minutes} min</span>
      </div>

      {/* Cesium globe */}
      <div
        ref={containerRef}
        id="cesium-container"
        style={{ height: 420, borderRadius: "0.75rem", overflow: "hidden" }}
      />

      <p className="text-xs text-slate-500 font-mono">
        🟠 SDSC SHAR launch site · Orbit path rendered in inertial frame · Drag to rotate
      </p>
    </div>
  );
}
