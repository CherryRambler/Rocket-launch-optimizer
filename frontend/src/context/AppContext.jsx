import { createContext, useContext, useState, useCallback, useRef } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Mission results ───────────────────────────────────────────────────────
  const [windows, setWindows]         = useState([]);     // top 20 launch windows
  const [chartData, setChartData]     = useState([]);     // full timeline
  const [orbitData, setOrbitData]     = useState(null);   // orbit preview
  const [selectedWindow, setSelectedWindow] = useState(null);

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
    ].slice(-6); // keep last 6
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
