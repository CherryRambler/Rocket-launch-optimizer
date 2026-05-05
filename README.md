# 🚀 ISRO Launch Window Optimizer

A full-stack mission planning tool that identifies optimal rocket launch windows from **Sriharikota (SDSC SHAR)**, India's primary launch site.

Combines **orbital mechanics**, **live weather data**, and **fuel efficiency** to score and rank every 10-minute launch slot in a user-selected date range.

---

## Features

| Feature | Details |
|---|---|
| **Smart Scoring** | 40% orbital alignment · 40% Δv efficiency · 20% weather |
| **Multi-orbit support** | LEO (500 km) · GEO (35,786 km) · SSO (600 km) |
| **Live weather** | OpenWeatherMap API for Sriharikota forecasts |
| **3D visualisation** | Cesium.js globe with orbit path + launch site marker |
| **Score timeline** | Recharts area chart across entire date range |
| **PDF export** | Mission planning report via jsPDF |

---

## Project Structure

```
rocket-launch-optimizer/
├── backend/
│   ├── main.py              # FastAPI routes
│   ├── orbital_engine.py    # Skyfield + Astropy orbital mechanics
│   ├── weather_service.py   # OpenWeatherMap integration
│   ├── scorer.py            # Window scoring algorithm
│   ├── models.py            # Pydantic request/response models
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── InputForm.jsx      # Orbit/date/payload selector
    │   │   ├── WindowsTable.jsx   # Top 10 ranked windows
    │   │   ├── ScoreChart.jsx     # Recharts score timeline
    │   │   ├── OrbitViewer.jsx    # Cesium 3D globe
    │   │   └── ExportButton.jsx   # jsPDF report export
    │   ├── App.jsx
    │   ├── api.js             # Axios API client
    │   └── index.css
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Optional: set your OpenWeatherMap API key
cp .env.example .env
# edit .env and add OPENWEATHER_API_KEY=your_key_here

uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/calculate-windows` | Main scoring — returns top 10 launch windows |
| `POST` | `/chart-data` | Full score timeline for Recharts |
| `GET` | `/weather` | Live weather forecast for Sriharikota |
| `GET` | `/orbit-preview` | Orbit parameters + Cesium CZML packet |
| `GET` | `/health` | Liveness check |

### Example request

```json
POST /calculate-windows
{
  "orbit_type": "LEO",
  "start_date": "2026-05-10",
  "end_date": "2026-05-17",
  "payload_mass_kg": 500
}
```

---

## Scoring Algorithm

Every 10-minute slot receives a score out of 100:

```
score = 0.40 × orbital_alignment
      + 0.40 × delta_v_efficiency
      + 0.20 × weather_suitability
```

**Orbital alignment** — peaks when Earth's rotation positions SHAR's RAAN optimally for the target orbit.

**Delta-V efficiency** — computed from Hohmann transfer + inclination change from SHAR's latitude (13.72°N). Lower Δv = higher score.

**Weather suitability** — based on cloud cover, wind speed, precipitation, and lightning risk from OWM. Slots with lightning are heavily penalised.

---

## Deployment

### Backend → Railway

```bash
# Add to backend: Procfile
echo "web: uvicorn main:app --host 0.0.0.0 --port \$PORT" > Procfile
```

Push to GitHub → connect repo in [Railway](https://railway.app) → set `OPENWEATHER_API_KEY` env var.

### Frontend → Vercel

```bash
# Set environment variable in Vercel dashboard:
VITE_API_URL=https://your-backend.railway.app
```

Push `frontend/` to GitHub → import in [Vercel](https://vercel.com).

---

## Weather Fallback

If `OPENWEATHER_API_KEY` is not set, the app generates **deterministic synthetic weather** using a hash of the timestamp. Output is stable across runs — useful for demos and testing.

---

## Tech Stack

**Backend:** FastAPI · Skyfield · Astropy · Pydantic · Uvicorn · Requests

**Frontend:** React 18 · Tailwind CSS · Recharts · Cesium.js / Resium · jsPDF · Axios · Vite
