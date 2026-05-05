"""
Orbital mechanics engine using Skyfield + Astropy.
Computes Earth rotation alignment, delta-V, and ground track for LEO/GEO/SSO
from Sriharikota (SDSC SHAR).
"""

import math
from datetime import datetime, timedelta, timezone
from typing import List

from skyfield.api import load

from models import OrbitType, OrbitalData

SRIHARIKOTA_LAT = 13.7199
SRIHARIKOTA_LON = 80.2304

MU_EARTH = 3.986004418e14   # m³/s²
R_EARTH  = 6_371_000        # m
OMEGA_EARTH = 7.2921150e-5  # rad/s  (Earth rotation rate)

ORBIT_PARAMS = {
    OrbitType.LEO: {"altitude_km": 500,    "inclination_deg": 20.0},
    OrbitType.GEO: {"altitude_km": 35_786, "inclination_deg": 0.0},
    OrbitType.SSO: {"altitude_km": 600,    "inclination_deg": 97.8},
}


# ── Orbital mechanics helpers ─────────────────────────────────────────────────

def _orbital_velocity(altitude_m: float) -> float:
    return math.sqrt(MU_EARTH / (R_EARTH + altitude_m))


def _period_seconds(altitude_m: float) -> float:
    r = R_EARTH + altitude_m
    return 2 * math.pi * math.sqrt(r**3 / MU_EARTH)


def _hohmann_dv(h1_m: float, h2_m: float) -> float:
    r1, r2 = R_EARTH + h1_m, R_EARTH + h2_m
    a_t = (r1 + r2) / 2
    dv1 = abs(math.sqrt(MU_EARTH * (2/r1 - 1/a_t)) - math.sqrt(MU_EARTH / r1))
    dv2 = abs(math.sqrt(MU_EARTH / r2) - math.sqrt(MU_EARTH * (2/r2 - 1/a_t)))
    return dv1 + dv2


def _plane_change_dv(altitude_m: float, delta_inc_deg: float) -> float:
    v = _orbital_velocity(altitude_m)
    return 2 * v * math.sin(math.radians(delta_inc_deg) / 2)


def _launch_azimuth(orbit_type: OrbitType) -> float:
    """Optimal launch azimuth from Sriharikota for each orbit type."""
    inc_deg = ORBIT_PARAMS[orbit_type]["inclination_deg"]
    lat = SRIHARIKOTA_LAT
    if orbit_type == OrbitType.GEO:
        return 90.0
    sin_az = math.sin(math.radians(inc_deg)) / math.cos(math.radians(lat))
    sin_az = max(-1.0, min(1.0, sin_az))
    az = math.degrees(math.asin(sin_az))
    if orbit_type == OrbitType.SSO:
        az = 180.0 - az
    return az % 360


def _compute_delta_v(orbit_type: OrbitType, payload_kg: float) -> float:
    """Total mission delta-V from Sriharikota (m/s)."""
    params = ORBIT_PARAMS[orbit_type]
    target_alt_m = params["altitude_km"] * 1000
    park_alt_m   = 200_000
    park_v       = _orbital_velocity(park_alt_m)

    # Ascent to parking orbit (includes gravity + drag losses ~1500 m/s)
    dv_ascent = park_v + 1500.0
    dv_transfer = _hohmann_dv(park_alt_m, target_alt_m)

    achieved_inc = abs(SRIHARIKOTA_LAT)   # minimum achievable inclination
    target_inc   = params["inclination_deg"]
    dv_plane     = _plane_change_dv(target_alt_m, abs(achieved_inc - target_inc))

    # Small payload-dependent overhead (structural mass ratio effect)
    payload_factor = 1.0 + (payload_kg / 50000) * 0.05
    return (dv_ascent + dv_transfer + dv_plane) * payload_factor


def _local_sidereal_time(dt: datetime) -> float:
    """LST at Sriharikota in degrees."""
    ts = load.timescale()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    t = ts.from_datetime(dt)
    gst_deg = t.gast * 15.0
    return (gst_deg + SRIHARIKOTA_LON) % 360


def _alignment_score(orbit_type: OrbitType, dt: datetime) -> float:
    """0-100 score for how well Earth's rotation positions SHAR for the target orbit."""
    lst = _local_sidereal_time(dt)

    if orbit_type == OrbitType.GEO:
        # GEO is equatorial — launch due east any time of day, ~constant alignment
        return 85.0 + 15.0 * math.cos(math.radians(lst * 0.1))

    # For LEO/SSO: score peaks when LST aligns with the ideal ascending node
    # Ideal RAAN cycles with the sidereal day; score is cosine of the offset
    ideal_raan = (dt.hour * 15.0 + dt.minute * 0.25 + SRIHARIKOTA_LON) % 360
    diff = abs(lst - ideal_raan) % 360
    if diff > 180:
        diff = 360 - diff

    base_score = max(0.0, 100.0 * (1.0 - diff / 180.0))

    # Bonus for launches close to local noon (sun angle good for solar panels)
    hour_utc = dt.hour + dt.minute / 60
    ist_hour  = (hour_utc + 5.5) % 24
    noon_bonus = max(0.0, 5.0 * (1.0 - abs(ist_hour - 10.5) / 6.0))  # peak ~10:30 IST

    return min(100.0, base_score + noon_bonus)


# ── Public API ────────────────────────────────────────────────────────────────

def compute_orbital_windows(
    orbit_type: OrbitType,
    start_dt: datetime,
    end_dt: datetime,
    payload_kg: float,
    interval_minutes: int = 10,
) -> List[OrbitalData]:
    results: List[OrbitalData] = []
    params  = ORBIT_PARAMS[orbit_type]
    alt_m   = params["altitude_km"] * 1000
    azimuth = _launch_azimuth(orbit_type)

    base_dv = _compute_delta_v(orbit_type, payload_kg)
    # Worst-case DV: add 90° plane change cost for normalisation reference
    worst_dv = base_dv + _plane_change_dv(alt_m, 90.0)
    dv_range = max(worst_dv - base_dv, 1.0)

    current = start_dt
    while current <= end_dt:
        alignment = _alignment_score(orbit_type, current)
        # Slightly vary DV with time-of-day (Earth's surface velocity adds ~465 m/s eastward)
        ist_hour = ((current.hour + 5.5) % 24)
        dv_variation = base_dv * (1.0 + 0.01 * math.sin(math.radians(ist_hour * 15)))
        dv_score = max(0.0, 100.0 * (1.0 - (dv_variation - base_dv) / dv_range))

        results.append(OrbitalData(
            timestamp=current,
            azimuth_deg=round(azimuth, 2),
            alignment_score=round(alignment, 2),
            delta_v_ms=round(dv_variation, 1),
            delta_v_score=round(dv_score, 2),
        ))
        current += timedelta(minutes=interval_minutes)

    return results


def get_orbit_preview_params(orbit_type: OrbitType, altitude_km: float = None) -> dict:
    """Return orbit parameters + sampled ground track for Cesium."""
    params = ORBIT_PARAMS[orbit_type].copy()
    if altitude_km is not None:
        params["altitude_km"] = altitude_km

    alt_m = params["altitude_km"] * 1000
    inc_deg = params["inclination_deg"]
    r = R_EARTH + alt_m
    period_s = _period_seconds(alt_m)

    # Sample ground track over 3 orbits
    ground_track = []
    n_steps = 360
    for i in range(n_steps + 1):
        angle_rad = 2 * math.pi * i / n_steps
        # Simple ground track: rotate along inclination, add Earth rotation
        t_frac = i / n_steps * period_s * 3   # 3 orbits
        # Satellite position in orbital plane
        sat_lon = SRIHARIKOTA_LON + math.degrees(angle_rad) - math.degrees(OMEGA_EARTH * t_frac)
        sat_lat = math.degrees(math.asin(math.sin(math.radians(inc_deg)) * math.sin(angle_rad)))
        ground_track.append({"lon": round(sat_lon % 360 - 180, 3), "lat": round(sat_lat, 3)})

    # CZML cartesian positions (inertial frame, one orbit)
    czml_positions = []
    for i in range(n_steps + 1):
        angle = 2 * math.pi * i / n_steps
        t_s = i * period_s / n_steps
        x = r * math.cos(angle)
        y = r * math.sin(angle) * math.cos(math.radians(inc_deg))
        z = r * math.sin(angle) * math.sin(math.radians(inc_deg))
        czml_positions.extend([t_s, x, y, z])

    czml = {
        "id": f"{orbit_type.value}_orbit",
        "name": f"{orbit_type.value} Orbit ({params['altitude_km']} km)",
        "path": {
            "material": {"solidColor": {"color": {"rgba": [0, 212, 255, 220]}}},
            "width": 2,
        },
        "position": {
            "interpolationAlgorithm": "LAGRANGE",
            "interpolationDegree": 5,
            "referenceFrame": "INERTIAL",
            "epoch": "2026-01-01T00:00:00Z",
            "cartesian": czml_positions,
        },
    }

    return {
        "altitude_km": params["altitude_km"],
        "inclination_deg": inc_deg,
        "period_minutes": round(period_s / 60, 1),
        "orbital_velocity_ms": round(_orbital_velocity(alt_m), 1),
        "ground_track": ground_track,
        "cesium_czml": czml,
    }
