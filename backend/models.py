from pydantic import BaseModel, Field
from typing import List
from datetime import datetime
from enum import Enum


class OrbitType(str, Enum):
    LEO = "LEO"
    GEO = "GEO"
    SSO = "SSO"


class LaunchRequest(BaseModel):
    orbit_type: OrbitType
    start_date: str
    end_date: str
    payload_mass_kg: float = Field(..., gt=0, le=10000)
    weather_weight: float = Field(default=0.20, ge=0.0, le=1.0)
    wind_tolerance_kmh: float = Field(default=54.0, ge=0.0, le=180.0)


class ValidateWindowRequest(BaseModel):
    datetime_iso: str
    orbit_type: OrbitType
    payload_mass_kg: float = Field(..., gt=0, le=10000)


class WeatherData(BaseModel):
    timestamp: datetime
    cloud_cover_pct: float
    wind_speed_ms: float
    wind_direction_deg: float
    temperature_c: float
    precipitation_mm: float
    humidity_pct: float
    lightning_risk: bool
    weather_score: float
    launch_risk_level: str  # "GO", "MARGINAL", "SCRUB"


class CurrentWeatherResponse(BaseModel):
    location: str
    latitude: float
    longitude: float
    current: WeatherData
    forecast_3h: List[WeatherData]


class OrbitalData(BaseModel):
    timestamp: datetime
    azimuth_deg: float
    alignment_score: float
    delta_v_ms: float
    delta_v_score: float


class LaunchWindow(BaseModel):
    rank: int
    timestamp: datetime
    score_total: float
    score_orbital: float
    score_delta_v: float
    score_weather: float
    azimuth_deg: float
    delta_v_ms: float
    cloud_cover_pct: float
    wind_speed_ms: float
    wind_direction_deg: float
    temperature_c: float
    lightning_risk: bool
    launch_risk_level: str
    orbit_type: OrbitType
    payload_mass_kg: float


class LaunchWindowsResponse(BaseModel):
    windows: List[LaunchWindow]
    orbit_type: OrbitType
    total_slots_analyzed: int
    best_window: LaunchWindow


class OrbitPreviewResponse(BaseModel):
    orbit_type: OrbitType
    altitude_km: float
    inclination_deg: float
    period_minutes: float
    orbital_velocity_ms: float
    ground_track: List[dict]   # [{lon, lat}] for Cesium polyline
    cesium_czml: dict


class HistoricalMission(BaseModel):
    name: str
    launch_date: str
    orbit_type: OrbitType
    payload_mass_kg: float
    actual_weather_desc: str
    optimizer_score: float
    score_orbital: float
    score_delta_v: float
    score_weather: float
    delta_v_ms: float
    launch_success: bool
    description: str
    fun_fact: str


class ValidateWindowResponse(BaseModel):
    timestamp: datetime
    orbit_type: OrbitType
    score_total: float
    score_orbital: float
    score_delta_v: float
    score_weather: float
    delta_v_ms: float
    azimuth_deg: float
    weather: WeatherData
    recommendation: str
