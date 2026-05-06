# Rocket Launch Optimizer

Full-stack mission planning app that calculates and ranks launch windows from Sriharikota using orbital mechanics, weather signals, and Delta-V efficiency.

## Stack

- Backend: FastAPI, Pydantic, Uvicorn
- Frontend: React, Vite, Tailwind, Recharts, Three.js

## Repository Layout

```text
Rocket-launch-optimizer/
  backend/
    main.py
    requirements.txt
    .env.example
  frontend/
    src/
    package.json
```

## Prerequisites

- Python 3.11+ (3.12 recommended)
- Node.js 18+ and npm

## Backend Setup

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Run backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Backend health check:

```bash
http://localhost:8000/health
```

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Set API base URL in `frontend/.env`:

```bash
VITE_API_URL=http://localhost:8000
```

Run frontend:

```bash
npm run dev
```

Frontend URL:

```bash
http://localhost:5173
```

## API Endpoints

- `GET /health`
- `POST /calculate-windows`
- `POST /chart-data`
- `GET /weather`
- `GET /orbit-preview`
- `POST /validate-window`
- `GET /historical-missions`

## Production URLs (Current)

- Frontend: `https://frontend-gilt-five-29.vercel.app`
- Backend: `https://backend-five-gamma-26.vercel.app`

## Clone And Run (Quick)

```bash
git clone https://github.com/CherryRambler/Rocket-launch-optimizer.git
cd Rocket-launch-optimizer
```

Then follow backend + frontend setup above.

## Notes

- `node_modules`, `dist`, `.venv`, caches, and logs are intentionally excluded from git.
- `.env` files are not committed. Use `.env.example` as template.

