"""
Window scoring: 40% orbital alignment + 40% delta-V efficiency + 20% weather.
Supports custom weather_weight and wind_tolerance overrides for the What-If simulator.
"""

from typing import List

from models import OrbitType, LaunchWindow, OrbitalData, WeatherData
from weather_service import interpolate_weather_at, _weather_score, _risk_level


def score_windows(
    orbital_slots: List[OrbitalData],
    weather_forecast: List[WeatherData],
    orbit_type: OrbitType,
    payload_kg: float,
    top_n: int = 20,
    weather_weight: float = 0.20,
    wind_tolerance_ms: float = 15.0,
) -> List[LaunchWindow]:
    orbital_weight = (1.0 - weather_weight) / 2
    delta_v_weight = (1.0 - weather_weight) / 2

    scored: list[tuple[float, LaunchWindow]] = []

    for slot in orbital_slots:
        wx = interpolate_weather_at(slot.timestamp, weather_forecast)

        # Recompute weather score with custom wind tolerance
        wx_score = _weather_score(
            wx.cloud_cover_pct, wx.wind_speed_ms,
            wx.precipitation_mm, wx.lightning_risk,
            wind_tolerance_ms,
            pressure_hpa=wx.pressure_hpa,
            wind_gust_ms=wx.wind_gust_ms,
        )

        total = (
            orbital_weight * slot.alignment_score
            + delta_v_weight * slot.delta_v_score
            + weather_weight * wx_score
        )
        total = round(total, 2)

        window = LaunchWindow(
            rank=0,
            timestamp=slot.timestamp,
            score_total=total,
            score_orbital=slot.alignment_score,
            score_delta_v=slot.delta_v_score,
            score_weather=wx_score,
            azimuth_deg=slot.azimuth_deg,
            delta_v_ms=slot.delta_v_ms,
            cloud_cover_pct=wx.cloud_cover_pct,
            wind_speed_ms=wx.wind_speed_ms,
            wind_direction_deg=wx.wind_direction_deg,
            wind_gust_ms=wx.wind_gust_ms,
            temperature_c=wx.temperature_c,
            pressure_hpa=wx.pressure_hpa,
            lightning_risk=wx.lightning_risk,
            launch_risk_level=_risk_level(wx.cloud_cover_pct, wx.wind_speed_ms, wx.lightning_risk),
            orbit_type=orbit_type,
            payload_mass_kg=payload_kg,
        )
        scored.append((total, window))

    scored.sort(key=lambda x: x[0], reverse=True)

    results: List[LaunchWindow] = []
    for rank, (_, win) in enumerate(scored[:top_n], start=1):
        win.rank = rank
        results.append(win)
    return results


def all_scores_for_chart(
    orbital_slots: List[OrbitalData],
    weather_forecast: List[WeatherData],
    weather_weight: float = 0.20,
    wind_tolerance_ms: float = 15.0,
) -> List[dict]:
    orbital_weight = delta_v_weight = (1.0 - weather_weight) / 2
    out = []
    for slot in orbital_slots:
        wx = interpolate_weather_at(slot.timestamp, weather_forecast)
        wx_score = _weather_score(
            wx.cloud_cover_pct, wx.wind_speed_ms,
            wx.precipitation_mm, wx.lightning_risk,
            wind_tolerance_ms,
            pressure_hpa=wx.pressure_hpa,
            wind_gust_ms=wx.wind_gust_ms,
        )
        total = (
            orbital_weight * slot.alignment_score
            + delta_v_weight * slot.delta_v_score
            + weather_weight * wx_score
        )
        out.append({
            "timestamp": slot.timestamp.isoformat(),
            "score": round(total, 2),
            "score_orbital": round(slot.alignment_score, 2),
            "score_delta_v": round(slot.delta_v_score, 2),
            "score_weather": round(wx_score, 2),
        })
    return out
