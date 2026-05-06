# 🚀 Rocket Launch Optimizer

Full-stack mission planning app that calculates and ranks launch windows from Sriharikota (SDSC SHAR) using orbital mechanics, weather signals, and Delta-V efficiency.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/release/python-3120/)
[![Node.js 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

## ✨ Features

- **Orbital Mechanics Engine**: Computes optimal launch windows based on orbital alignment and Delta-V requirements
- **Weather Integration**: Fetches and analyzes weather forecasts for launch viability
- **Multi-factor Scoring**: Combines orbital, Delta-V, and weather scores to rank launch opportunities
- **Interactive 3D Visualization**: View orbit previews with Cesium.js
- **Historical Mission Data**: Access past ISRO launches for reference
- **RESTful API**: Well-documented backend endpoints for integration
- **Modern Frontend**: React-based UI with real-time charts and responsive design

## 🛠️ Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **Pydantic** - Data validation and settings management
- **Uvicorn** - ASGI server for production deployment
- **Python 3.12+** - Core programming language

### Frontend
- **React 18** - JavaScript library for building user interfaces
- **Vite** - Next-generation frontend tooling
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Charting library built on React and D3
- **Three.js** + **CesiumJS** - 3D visualization and orbital mechanics rendering

## 📁 Repository Structure

```
Rocket-launch-optimizer/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── models.py            # Pydantic models for request/response
│   ├── orbital_engine.py    # Core orbital mechanics calculations
│   ├── weather_service.py   # Weather data fetching and processing
│   ├── scorer.py            # Window scoring algorithms
│   ├── historical_data.py   # Historical mission data
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variables template
└── frontend/
    ├── src/
    │   ├── components/      # Reusable UI components
    │   ├── context/         # React context for state management
    │   ├── App.jsx          # Main application component
    │   └── main.jsx         # React entry point
    ├── public/              # Static assets
    ├── package.json         # Node.js dependencies and scripts
    ├── vite.config.js       # Vite configuration
    ├── tailwind.config.js   # Tailwind CSS configuration
    └── .env.example         # Environment variables template
```

## ⚙️ Setup Instructions

### Prerequisites
- Python 3.12+ (strongly recommended)
- Node.js 18+ and npm
- Git

### Backend Setup
```bash
# Clone the repository
git clone https://github.com/CherryRambler/Rocket-launch-optimizer.git
cd Rocket-launch-optimizer/backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.\.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env to add any required API keys (if needed)

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd Rocket-launch-optimizer/frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Set the API base URL (adjust if backend runs on different port/host)
echo "VITE_API_URL=http://localhost:8000" >> .env

# Start the development server
npm run dev
```

### Verification
- Backend health check: `http://localhost:8000/health`
- Frontend application: `http://localhost:5173`

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check |
| `GET` | `/weather` | Current weather and forecast for Sriharikota |
| `GET` | `/orbit-preview` | Orbital parameters and visualization data |
| `POST` | `/calculate-windows` | Calculate and rank launch windows |
| `POST` | `/chart-data` | Get scoring data for charts |
| `POST` | `/validate-window` | Validate a specific launch window |
| `GET` | `/historical-missions` | List of past ISRO launches |

## 🌐 Production Deployment

- **Frontend**: [Vercel Deployment](https://frontend-gilt-five-29.vercel.app)
- **Backend**: [Vercel Deployment](https://backend-five-gamma-26.vercel.app)

## 📝 Notes

- Environment files (`.env`) are excluded from version control. Use the provided `.env.example` templates.
- Build artifacts (`node_modules`, `dist`, `.venv`, etc.) are intentionally excluded from Git.
- The project uses [Vercel](https://vercel.com) for seamless deployment of both frontend and backend.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure your code follows the existing style and includes appropriate tests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Contact

Project Maintainer: [CherryRambler](https://github.com/CherryRambler)

## 🙏 Acknowledgments

- Indian Space Research Organisation (ISRO) for open mission data
- OpenWeatherMap for weather data APIs
- The FastAPI, React, and Three.js communities for excellent documentation