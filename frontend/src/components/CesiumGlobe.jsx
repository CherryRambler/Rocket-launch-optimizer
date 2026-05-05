import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";

const SHAR = { lon: 80.2304, lat: 13.7199 };
const ORBIT_COLOR = { LEO: [0, 210, 255, 200], GEO: [179, 136, 255, 200], SSO: [0, 230, 118, 200] };

export default function CesiumGlobe() {
  const containerRef   = useRef(null);
  const viewerRef      = useRef(null);
  const orbitRef       = useRef(null);
  const trajRef        = useRef(null);
  const [status, setStatus] = useState("loading");
  const { orbitData, selectedWindow } = useApp();

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let viewer = null;

    (async () => {
      try {
        const Cesium = (await import("cesium")).default ?? (await import("cesium"));
        await import("cesium/Build/Cesium/Widgets/widgets.css").catch(() => {});

        Cesium.Ion.defaultAccessToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1iOGI3MDkxOWQ2MjciLCJpZCI6NTc3MzMsImlhdCI6MTYyMjY0NDA5N30.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk";

        if (cancelled || !containerRef.current) return;

        viewer = new Cesium.Viewer(containerRef.current, {
          animation: false, baseLayerPicker: false, fullscreenButton: false,
          geocoder: false, homeButton: false, infoBox: false,
          sceneModePicker: false, selectionIndicator: false,
          timeline: false, navigationHelpButton: false,
        });
        viewerRef.current = viewer;
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#080c18");

        // Launch site marker
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(SHAR.lon, SHAR.lat, 0),
          point: { pixelSize: 10, color: Cesium.Color.fromCssColorString("#00d2ff"), outlineColor: Cesium.Color.WHITE, outlineWidth: 1.5 },
          label: {
            text: "SDSC SHAR",
            font: "11px JetBrains Mono, monospace",
            fillColor: Cesium.Color.fromCssColorString("#00d2ff"),
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2e7),
          },
        });

        viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(SHAR.lon + 15, 8, 10_000_000) });
        if (!cancelled) setStatus("ready");
      } catch (e) {
        console.warn("Cesium:", e);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // ── Orbit ring ────────────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !orbitData || status !== "ready") return;

    (async () => {
      try {
        const Cesium = (await import("cesium")).default ?? (await import("cesium"));
        if (orbitRef.current) { viewer.entities.remove(orbitRef.current); orbitRef.current = null; }

        const raw = orbitData.cesium_czml?.position?.cartesian || [];
        if (raw.length < 4) return;

        const positions = [];
        for (let i = 0; i < raw.length; i += 4)
          positions.push(new Cesium.Cartesian3(raw[i + 1], raw[i + 2], raw[i + 3]));

        const [r, g, b, a] = ORBIT_COLOR[orbitData.orbit_type] ?? ORBIT_COLOR.LEO;
        orbitRef.current = viewer.entities.add({
          polyline: {
            positions,
            width: 1.5,
            arcType: Cesium.ArcType.NONE,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: new Cesium.Color(r / 255, g / 255, b / 255, a / 255),
            }),
          },
        });
      } catch (e) { console.warn("Orbit ring:", e); }
    })();
  }, [orbitData, status]);

  // ── Trajectory arc ────────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedWindow || !orbitData || status !== "ready") return;

    (async () => {
      try {
        const Cesium = (await import("cesium")).default ?? (await import("cesium"));
        if (trajRef.current) { viewer.entities.remove(trajRef.current); trajRef.current = null; }

        const altM  = orbitData.altitude_km * 1000;
        const azRad = ((selectedWindow.azimuth_deg ?? 90) * Math.PI) / 180;
        const positions = [];
        for (let i = 0; i <= 40; i++) {
          const frac = i / 40;
          const h    = altM * (1 - (1 - frac) ** 2);
          const km   = 500 * frac;
          const lat  = SHAR.lat + (km / 111) * Math.cos(azRad);
          const lon  = SHAR.lon + (km / (111 * Math.cos(SHAR.lat * Math.PI / 180))) * Math.sin(azRad);
          positions.push(Cesium.Cartesian3.fromDegrees(lon, lat, h));
        }

        trajRef.current = viewer.entities.add({
          polyline: {
            positions,
            width: 1.5,
            arcType: Cesium.ArcType.NONE,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.3,
              color: Cesium.Color.fromCssColorString("#ff7043bb"),
            }),
          },
        });
      } catch (e) { console.warn("Trajectory:", e); }
    })();
  }, [selectedWindow, orbitData, status]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 10, overflow: "hidden" }}>
      <div ref={containerRef} id="cesium-container" />

      {status === "loading" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#080c18", borderRadius: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 24, height: 24, border: "2px solid var(--cyan)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>Loading globe…</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#080c18", borderRadius: 10, gap: 8 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>
          </svg>
          <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>Globe unavailable</p>
        </div>
      )}

      {status === "ready" && orbitData && (
        <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(8,12,24,0.75)", borderRadius: 5, padding: "4px 10px" }}>
          <p className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
            {orbitData.orbit_type} · {orbitData.altitude_km.toLocaleString()} km · {orbitData.inclination_deg}° inc
          </p>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
