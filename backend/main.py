"""
FastAPI — Rocket Launch Window Optimizer
Endpoints:
  POST /calculate-windows
  POST /chart-data
  POST /validate-window
  GET  /weather
  GET  /orbit-preview
  GET  /historical-missions
  GET  /health
"""

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from models import (
    LaunchRequest, LaunchWindowsResponse, CurrentWeatherResponse,
    OrbitPreviewResponse, OrbitType, ValidateWindowRequest,
    ValidateWindowResponse, HistoricalMission,
)
from orbital_engine import compute_orbital_windows, get_orbit_preview_params
from weather_service import fetch_weather_forecast, fetch_current_weather, interpolate_weather_at
from scorer import score_windows, all_scores_for_chart
from historical_data import get_all_missions

app = FastAPI(
    title="ISRO Launch Window Optimizer",
    description="Optimal launch window analysis from SDSC SHAR, Sriharikota.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _parse_dt(s: str, label: str) -> datetime:
    try:
        dt = datetime.fromisoformat(s)
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
    except ValueError:
        raise HTTPException(400, f"Invalid {label}: '{s}'. Use ISO format e.g. 2026-05-10")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


# ── Weather ───────────────────────────────────────────────────────────────────

@app.get("/weather", response_model=CurrentWeatherResponse)
def get_weather(
    start_date: str = Query(None),
    end_date: str = Query(None),
):
    current = fetch_current_weather()

    if start_date and end_date:
        s = _parse_dt(start_date, "start_date")
        e = _parse_dt(end_date, "end_date")
        forecast = fetch_weather_forecast(s, e)
    else:
        from datetime import timedelta
        now = datetime.now(tz=timezone.utc)
        forecast = fetch_weather_forecast(now, now + timedelta(days=5))

    return CurrentWeatherResponse(
        location="Sriharikota (SDSC SHAR)",
        latitude=13.7199,
        longitude=80.2304,
        current=current,
        forecast_3h=forecast[:40],
    )


# ── Orbit Preview ─────────────────────────────────────────────────────────────

@app.get("/orbit-preview", response_model=OrbitPreviewResponse)
def orbit_preview(
    orbit_type: OrbitType = Query(...),
    altitude_km: float = Query(None),
):
    params = get_orbit_preview_params(orbit_type, altitude_km)
    return OrbitPreviewResponse(
        orbit_type=orbit_type,
        altitude_km=params["altitude_km"],
        inclination_deg=params["inclination_deg"],
        period_minutes=params["period_minutes"],
        orbital_velocity_ms=params["orbital_velocity_ms"],
        ground_track=params["ground_track"],
        cesium_czml=params["cesium_czml"],
    )


# ── Calculate Windows ─────────────────────────────────────────────────────────

@app.post("/calculate-windows", response_model=LaunchWindowsResponse)
def calculate_windows(req: LaunchRequest):
    start_dt = _parse_dt(req.start_date, "start_date")
    end_dt   = _parse_dt(req.end_date,   "end_date")

    if end_dt <= start_dt:
        raise HTTPException(400, "end_date must be after start_date")
    if (end_dt - start_dt).days > 30:
        raise HTTPException(400, "Date range cannot exceed 30 days")

    wind_tolerance_ms = req.wind_tolerance_kmh / 3.6

    orbital_slots    = compute_orbital_windows(req.orbit_type, start_dt, end_dt, req.payload_mass_kg)
    weather_forecast = fetch_weather_forecast(start_dt, end_dt)

    top_windows = score_windows(
        orbital_slots, weather_forecast,
        req.orbit_type, req.payload_mass_kg,
        top_n=20,
        weather_weight=req.weather_weight,
        wind_tolerance_ms=wind_tolerance_ms,
    )

    if not top_windows:
        raise HTTPException(404, "No valid launch windows found")

    return LaunchWindowsResponse(
        windows=top_windows,
        orbit_type=req.orbit_type,
        total_slots_analyzed=len(orbital_slots),
        best_window=top_windows[0],
    )


# ── Chart Data ────────────────────────────────────────────────────────────────

@app.post("/chart-data")
def chart_data(req: LaunchRequest):
    start_dt = _parse_dt(req.start_date, "start_date")
    end_dt   = _parse_dt(req.end_date,   "end_date")
    if end_dt <= start_dt:
        raise HTTPException(400, "end_date must be after start_date")

    wind_tolerance_ms = req.wind_tolerance_kmh / 3.6
    orbital_slots    = compute_orbital_windows(req.orbit_type, start_dt, end_dt, req.payload_mass_kg)
    weather_forecast = fetch_weather_forecast(start_dt, end_dt)
    data = all_scores_for_chart(
        orbital_slots, weather_forecast,
        weather_weight=req.weather_weight,
        wind_tolerance_ms=wind_tolerance_ms,
    )
    return {"data": data, "total_slots": len(data)}


# ── Validate Window ───────────────────────────────────────────────────────────

@app.post("/validate-window", response_model=ValidateWindowResponse)
def validate_window(req: ValidateWindowRequest):
    dt = _parse_dt(req.datetime_iso, "datetime_iso")

    from datetime import timedelta
    orbital_slots    = compute_orbital_windows(req.orbit_type, dt, dt + timedelta(minutes=10), req.payload_mass_kg)
    weather_forecast = fetch_weather_forecast(dt, dt + timedelta(hours=3))

    if not orbital_slots:
        raise HTTPException(404, "Could not compute orbital data for this window")

    slot = orbital_slots[0]
    wx   = interpolate_weather_at(dt, weather_forecast)

    from scorer import _weather_score as wx_score_fn, _risk_level as risk_fn
    wx_score = wx_score_fn(wx.cloud_cover_pct, wx.wind_speed_ms, wx.precipitation_mm, wx.lightning_risk)

    w_orb = w_dv = 0.40
    w_wx  = 0.20
    total = round(w_orb * slot.alignment_score + w_dv * slot.delta_v_score + w_wx * wx_score, 2)

    if total >= 80:
        rec = "GO — Excellent launch conditions."
    elif total >= 60:
        rec = "MARGINAL — Acceptable but monitor weather closely."
    else:
        rec = "SCRUB — Consider postponing to a higher-scored window."

    return ValidateWindowResponse(
        timestamp=dt,
        orbit_type=req.orbit_type,
        score_total=total,
        score_orbital=slot.alignment_score,
        score_delta_v=slot.delta_v_score,
        score_weather=wx_score,
        delta_v_ms=slot.delta_v_ms,
        azimuth_deg=slot.azimuth_deg,
        weather=wx,
        recommendation=rec,
    )


# ── Historical Missions ───────────────────────────────────────────────────────

@app.get("/historical-missions", response_model=list[HistoricalMission])
def historical_missions():
    return get_all_missions()
