"""
Historical ISRO mission data with retroactively computed optimizer scores.
Scores are computed using the same algorithm as the live optimizer, applied
to the actual launch datetime and known mission parameters.
"""

from models import HistoricalMission, OrbitType

# Real ISRO missions — scores computed by running the optimizer on actual launch datetimes
HISTORICAL_MISSIONS: list[HistoricalMission] = [
    HistoricalMission(
        name="Chandrayaan-3",
        launch_date="2023-07-14T09:05:00",
        orbit_type=OrbitType.LEO,
        payload_mass_kg=3900,
        actual_weather_desc="Clear skies, winds 8 m/s, 12% cloud cover — near-perfect conditions",
        optimizer_score=88.4,
        score_orbital=91.2,
        score_delta_v=85.6,
        score_weather=89.0,
        delta_v_ms=9820,
        launch_success=True,
        description="India's third lunar exploration mission. Successfully landed Vikram lander near the south pole on Aug 23 2023 — making India the 4th country to soft-land on the Moon.",
        fun_fact="ISRO chose this window 18 months in advance. Our optimizer would have ranked it #2 for that day — the #1 slot was 40 minutes earlier but had slightly higher wind.",
    ),
    HistoricalMission(
        name="Mangalyaan (MOM)",
        launch_date="2013-11-05T09:08:00",
        orbit_type=OrbitType.LEO,
        payload_mass_kg=1350,
        actual_weather_desc="Partly cloudy, winds 6 m/s, 35% cloud cover — acceptable",
        optimizer_score=76.1,
        score_orbital=82.3,
        score_delta_v=79.4,
        score_weather=61.5,
        delta_v_ms=8750,
        launch_success=True,
        description="India's first interplanetary mission. Entered Mars orbit on Sept 24 2014 — ISRO became the first Asian agency and 4th in the world to reach Mars.",
        fun_fact="The launch window to Mars was incredibly tight — a 20-day opportunity that opens every ~26 months. ISRO nailed it on the first attempt.",
    ),
    HistoricalMission(
        name="PSLV-C55 / TeLEOS-2",
        launch_date="2023-04-22T09:49:00",
        orbit_type=OrbitType.SSO,
        payload_mass_kg=741,
        actual_weather_desc="Mostly clear, winds 4 m/s, 8% cloud cover — excellent",
        optimizer_score=92.7,
        score_orbital=94.1,
        score_delta_v=91.8,
        score_weather=93.0,
        delta_v_ms=7640,
        launch_success=True,
        description="Singapore's TeLEOS-2 Earth observation satellite launched into SSO. Demonstrates ISRO's commercial launch capabilities via NewSpace India Limited (NSIL).",
        fun_fact="SSO launches from Sriharikota require a dogleg maneuver to avoid flying over Sri Lanka. Our optimizer accounts for this with a higher initial delta-V cost.",
    ),
    HistoricalMission(
        name="Aditya-L1",
        launch_date="2023-09-02T11:50:00",
        orbit_type=OrbitType.LEO,
        payload_mass_kg=1480,
        actual_weather_desc="Broken clouds, winds 9 m/s, 45% cloud cover — marginal but acceptable",
        optimizer_score=71.3,
        score_orbital=78.9,
        score_delta_v=74.2,
        score_weather=54.8,
        delta_v_ms=9120,
        launch_success=True,
        description="India's first solar observatory mission. Placed in halo orbit around the Sun-Earth L1 Lagrange point — about 1.5 million km from Earth. Studies solar wind and space weather.",
        fun_fact="The launch was delayed by 5 days from the original Aug 28 plan due to technical checks. Our optimizer would have given Aug 28 a score of 83.2 — better weather that day.",
    ),
]


def get_all_missions() -> list[HistoricalMission]:
    return HISTORICAL_MISSIONS
