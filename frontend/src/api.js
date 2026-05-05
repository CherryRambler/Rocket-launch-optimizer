import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({ baseURL: BASE, timeout: 45_000 });

export const calculateWindows = (payload) =>
  client.post("/calculate-windows", payload).then(r => r.data);

export const fetchChartData = (payload) =>
  client.post("/chart-data", payload).then(r => r.data);

export const fetchWeather = (startDate, endDate) =>
  client.get("/weather", { params: { start_date: startDate, end_date: endDate } }).then(r => r.data);

export const fetchCurrentWeather = () =>
  client.get("/weather").then(r => r.data);

export const fetchOrbitPreview = (orbitType, altitudeKm) =>
  client.get("/orbit-preview", { params: { orbit_type: orbitType, altitude_km: altitudeKm } }).then(r => r.data);

export const validateWindow = (payload) =>
  client.post("/validate-window", payload).then(r => r.data);

export const fetchHistoricalMissions = () =>
  client.get("/historical-missions").then(r => r.data);
