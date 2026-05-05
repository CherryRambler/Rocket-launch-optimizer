"""
Weather service for Sriharikota via Open-Meteo (free, no API key required).
Falls back to deterministic synthetic data on network errors.
Cache: 5 minutes in-memory.
"""

import hashlib
import time
from datetime import datetime, timedelta, timezone
from typing import List

import requests

from models import WeatherData

SRIHARIKOTA_LAT  = 13.7199
SRIHARIKOTA_LON  = 80.2304
OPEN_METEO_URL   = "https://api.open-meteo.com/v1/forecast"

# Launch scrub thresholds
MAX_CLOUD_PCT    = 70
MAX_WIND_MS      = 15.0
LIGHTNING_CLOUD  = 80

# 5-minute cache
_cache: dict = {}
_CACHE_TTL = 300  # seconds


def _risk_level(cloud: float, wind: float, lightning: bool) -> str:
    if lightning or cloud > MAX_CLOUD_PCT or wind > MAX_WIND_MS:
        return "SCRUB"
    if cloud > 40 or wind > 10:
        return "MARGINAL"
    return "GO"


def _weather_score(cloud: float, wind: float, precip: float, lightning: bool,
                   wind_tolerance_ms: float = MAX_WIND_MS) -> float:
    cloud_score  = max(0.0, 100.0 - cloud)
    wind_score   = max(0.0, 100.0 - (wind / wind_tolerance_ms) * 100)
    precip_pen   = min(100.0, precip * 20)
    lightning_pen = 50.0 if lightning else 0.0
    raw = cloud_score * 0.4 + wind_score * 0.4 - precip_pen * 0.2 - lightning_pen
    return round(max(0.0, min(100.0, raw)), 2)


def _synthetic_point(dt: datetime) -> WeatherData:
    seed = int(hashlib.md5(dt.strftime("%Y-%m-%d %H").encode()).hexdigest()[:8], 16)
    r = (seed % 1000) / 1000.0

    month = dt.month
    monsoon = 1.0 if month in range(6, 10) else 0.35

    cloud   = round(r * 90 * monsoon, 1)
    wind    = round(2.0 + r * 14.0, 1)
    wind_dir = round((seed % 360), 1)
    temp    = round(28 + (1 - monsoon) * 8 + r * 5, 1)
    precip  = round(max(0.0, (r - 0.65) * 12 * monsoon), 2)
    humidity = round(55 + monsoon * 30 + r * 10, 1)
    lightning = cloud > LIGHTNING_CLOUD
    score   = _weather_score(cloud, wind, precip, lightning)

    return WeatherData(
        timestamp=dt,
        cloud_cover_pct=cloud,
        wind_speed_ms=wind,
        wind_direction_deg=wind_dir,
        temperature_c=temp,
        precipitation_mm=precip,
        humidity_pct=min(100.0, humidity),
        lightning_risk=lightning,
        weather_score=score,
        launch_risk_level=_risk_level(cloud, wind, lightning),
    )



def _cached(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None


def _store(key: str, data):
    _cache[key] = {"ts": time.time(), "data": data}


def _fetch_open_meteo(start_date: str, end_date: str) -> List[WeatherData]:
    """Fetch hourly data from Open-Meteo for the given date range."""
    r = requests.get(OPEN_METEO_URL, params={
        "latitude": SRIHARIKOTA_LAT,
        "longitude": SRIHARIKOTA_LON,
        "hourly": "temperature_2m,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,weather_code",
        "wind_speed_unit": "ms",
        "start_date": start_date,
        "end_date": end_date,
        "timezone": "UTC",
    }, timeout=10)
    r.raise_for_status()
    hourly = r.json()["hourly"]
    results = []
    for i, iso in enumerate(hourly["time"]):
        dt = datetime.fromisoformat(iso).replace(tzinfo=timezone.utc)
        cloud    = float(hourly["cloud_cover"][i] or 0)
        wind     = float(hourly["wind_speed_10m"][i] or 0)
        wind_dir = float(hourly["wind_direction_10m"][i] or 0)
        temp     = float(hourly["temperature_2m"][i] or 30)
        precip   = float(hourly["precipitation"][i] or 0)
        humidity = float(hourly["relative_humidity_2m"][i] or 60)
        wcode    = int(hourly["weather_code"][i] or 0)
        lightning = wcode in (95, 96, 99)
        score = _weather_score(cloud, wind, precip, lightning)
        results.append(WeatherData(
            timestamp=dt,
            cloud_cover_pct=cloud,
            wind_speed_ms=wind,
            wind_direction_deg=wind_dir,
            temperature_c=temp,
            precipitation_mm=precip,
            humidity_pct=humidity,
            lightning_risk=lightning,
            weather_score=score,
            launch_risk_level=_risk_level(cloud, wind, lightning),
        ))
    return results


def fetch_current_weather() -> WeatherData:
    cached = _cached("current")
    if cached:
        return cached

    try:
        now = datetime.now(tz=timezone.utc)
        points = _fetch_open_meteo(now.strftime("%Y-%m-%d"), now.strftime("%Y-%m-%d"))
        # Pick the point closest to now
        data = min(points, key=lambda p: abs((p.timestamp - now).total_seconds()), default=None)
        if data:
            _store("current", data)
            return data
    except Exception:
        pass

    data = _synthetic_point(datetime.now(tz=timezone.utc).replace(minute=0, second=0, microsecond=0))
    _store("current", data)
    return data


def fetch_weather_forecast(start_dt: datetime, end_dt: datetime) -> List[WeatherData]:
    cache_key = f"forecast_{start_dt.date()}_{end_dt.date()}"
    cached = _cached(cache_key)
    if cached:
        return cached

    try:
        points = _fetch_open_meteo(start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d"))
        filtered = [w for w in points if start_dt <= w.timestamp <= end_dt]
        _store(cache_key, filtered)
        return filtered
    except Exception:
        pass

    # Synthetic 3-hour intervals fallback
    results: List[WeatherData] = []
    cur = start_dt.replace(minute=0, second=0, microsecond=0)
    while cur <= end_dt:
        results.append(_synthetic_point(cur))
        cur += timedelta(hours=3)
    _store(cache_key, results)
    return results


def interpolate_weather_at(dt: datetime, forecast: List[WeatherData]) -> WeatherData:
    if not forecast:
        return _synthetic_point(dt)

    before, after = None, None
    for pt in forecast:
        if pt.timestamp <= dt:
            before = pt
        elif after is None:
            after = pt
            break

    if before is None:
        return forecast[0]
    if after is None:
        return before

    total = (after.timestamp - before.timestamp).total_seconds()
    elapsed = (dt - before.timestamp).total_seconds()
    w = elapsed / total if total > 0 else 0.0

    def lerp(a, b):
        return a + w * (b - a)

    cloud    = lerp(before.cloud_cover_pct, after.cloud_cover_pct)
    wind     = lerp(before.wind_speed_ms, after.wind_speed_ms)
    wind_dir = lerp(before.wind_direction_deg, after.wind_direction_deg)
    temp     = lerp(before.temperature_c, after.temperature_c)
    precip   = lerp(before.precipitation_mm, after.precipitation_mm)
    humidity = lerp(before.humidity_pct, after.humidity_pct)
    lightning = cloud > LIGHTNING_CLOUD
    score = _weather_score(cloud, wind, precip, lightning)

    return WeatherData(
        timestamp=dt,
        cloud_cover_pct=round(cloud, 1),
        wind_speed_ms=round(wind, 1),
        wind_direction_deg=round(wind_dir, 1),
        temperature_c=round(temp, 1),
        precipitation_mm=round(precip, 2),
        humidity_pct=round(humidity, 1),
        lightning_risk=lightning,
        weather_score=score,
        launch_risk_level=_risk_level(cloud, wind, lightning),
    )
