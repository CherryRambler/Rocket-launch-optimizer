import { createContext, useContext, useState, useCallback, useRef } from "react";

const AppContext = createContext(null);

export const LAUNCH_SITES = [
  { id: "sdsc", name: "Satish Dhawan (SDSC)", location: "Sriharikota", lat: 13.72, lon: 80.23, country: "India", timezone: "Asia/Kolkata" },
  { id: "ksc", name: "Kennedy Space Center", location: "Florida", lat: 28.57, lon: -80.65, country: "USA", timezone: "America/New_York" },
  { id: "baik", name: "Baikonur Cosmodrome", location: "Kazakhstan", lat: 45.96, lon: 63.31, country: "Kazakhstan", timezone: "Asia/Almaty" },
  { id: "kour", name: "Guiana Space Centre", location: "Kourou", lat: 5.24, lon: -52.76, country: "France", timezone: "America/Cayenne" },
  { id: "tane", name: "Tanegashima Center", location: "Japan", lat: 30.37, lon: 130.96, country: "Japan", timezone: "Asia/Tokyo" },
  { id: "vdb", name: "Vandenberg Base", location: "California", lat: 34.74, lon: -120.57, country: "USA", timezone: "America/Los_Angeles" },
  { id: "mhia", name: "Mahia Complex", location: "New Zealand", lat: -39.26, lon: 177.86, country: "New Zealand", timezone: "Pacific/Auckland" }
];

export function AppProvider({ children }) {
  // ── Mission results ───────────────────────────────────────────────────────
  const [windows, setWindows]         = useState([]);
  const [chartData, setChartData]     = useState([]);
  const [orbitData, setOrbitData]     = useState(null);
  const [selectedWindow, setSelectedWindow] = useState(null);
  const [chartMeta, setChartMeta]       = useState(null);
  const [chartExpanding, setChartExpanding] = useState(false);

  // ── Launch Site State ─────────────────────────────────────────────────────
  const [selectedSite, setSelectedSite] = useState(LAUNCH_SITES[0]);

  // ── Form / config ─────────────────────────────────────────────────────────
  const [formValues, setFormValues] = useState({
    orbit_type: "LEO",
    start_date: "",
    end_date: "",
    payload_mass_kg: 500,
    weather_weight: 0.20,
    wind_tolerance_kmh: 54,
  });

  // ── Loading / calculation feed ────────────────────────────────────────────
  const [loading, setLoading]   = useState(false);
  const [feedLines, setFeedLines] = useState([]);
  const [error, setError]       = useState(null);

  // ── Saved missions (for comparison mode) ─────────────────────────────────
  const [savedMissions, setSavedMissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("savedMissions") || "[]"); }
    catch { return []; }
  });

  // ── Alerts ────────────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("launchAlerts") || "[]"); }
    catch { return []; }
  });

  const persistAlerts = useCallback((list) => {
    setAlerts(list);
    localStorage.setItem("launchAlerts", JSON.stringify(list));
  }, []);

  const addAlert = useCallback((win) => {
    const next = [...alerts.filter(a => a.timestamp !== win.timestamp), {
      id: Date.now(),
      timestamp: win.timestamp,
      orbit_type: win.orbit_type,
      score_total: win.score_total,
      score_weather: win.score_weather,
      created: new Date().toISOString(),
    }];
    persistAlerts(next);
  }, [alerts, persistAlerts]);

  const removeAlert = useCallback((id) => {
    persistAlerts(alerts.filter(a => a.id !== id));
  }, [alerts, persistAlerts]);

  // ── Saved missions ────────────────────────────────────────────────────────
  const saveMission = useCallback((name, config, results) => {
    const next = [
      ...savedMissions.filter(m => m.name !== name),
      { name, config, results, savedAt: new Date().toISOString() },
    ].slice(-6);
    setSavedMissions(next);
    localStorage.setItem("savedMissions", JSON.stringify(next));
  }, [savedMissions]);

  const deleteMission = useCallback((name) => {
    const next = savedMissions.filter(m => m.name !== name);
    setSavedMissions(next);
    localStorage.setItem("savedMissions", JSON.stringify(next));
  }, [savedMissions]);

  const pushFeed = useCallback((line) => {
    setFeedLines(prev => [...prev, line]);
  }, []);

  const clearFeed = useCallback(() => setFeedLines([]), []);

  return (
    <AppContext.Provider value={{
      windows, setWindows,
      chartData, setChartData,
      orbitData, setOrbitData,
      selectedWindow, setSelectedWindow,
      chartMeta, setChartMeta,
      chartExpanding, setChartExpanding,
      selectedSite, setSelectedSite,
      formValues, setFormValues,
      loading, setLoading,
      feedLines, pushFeed, clearFeed,
      error, setError,
      savedMissions, saveMission, deleteMission,
      alerts, addAlert, removeAlert,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
