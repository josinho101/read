# READ — Rocket Engine Analysis & Design

A web-based rocket engine design tool. Input a propellant pair and thrust requirements; get back full thermochemistry, engine geometry, and a 3D nozzle contour — powered by NASA CEA via the [rocketcea](https://rocketcea.readthedocs.io/) library.

## Features

- Select oxidizer/fuel pair from a built-in propellant database
- Set chamber pressure, exit pressure, and target thrust
- Sweep O/F ratio range to find optimal mixture ratio
- View engine contour (chamber + nozzle geometry)
- Interactive O/F ratio vs. performance graphs
- REST API with Swagger docs at `/swagger/`

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.11+ | Backend runtime |
| Node.js | 20+ | Frontend build and dev server |
| Docker | any recent | Container run mode only |

## Running Locally (Development)

Two processes run in parallel: Flask on port 5000 and Vite on port 5173. Vite proxies `/api` and `/swagger` requests to Flask automatically.

### 1. Backend

```bash
cd api

# Create and activate a virtual environment
python -m venv env
# Windows:
env\Scripts\activate
# macOS/Linux:
source env/bin/activate

# Install dependencies (first run compiles rocketcea — takes a few minutes)
pip install -r requirements.txt

# Create local environment file
echo FLASK_DEBUG=1 > .env

# Start Flask
python app.py
```

Flask will be available at `http://localhost:5000`.

### 2. Frontend

Open a second terminal:

```bash
cd ui
npm install
npm run dev
```

Vite will be available at `http://localhost:5173`.

### 3. Open the app

Navigate to `http://localhost:5173` in your browser.

API docs: `http://localhost:5173/swagger/`

---

## Running in Docker

The image uses a 3-stage build: Node.js compiles the React frontend, a Python builder stage compiles rocketcea's Fortran code (gfortran/gcc are isolated here and never reach the final image), then a lean runtime stage serves everything from port 5000. No compiler toolchain needed on your machine.

```bash
# Build the image (first build takes ~10–15 minutes — rocketcea compiles Fortran)
docker build -t read-app .

# Run the container
docker run -d -p 5000:5000 read-app
```

Open `http://localhost:5000` in your browser.

API docs: `http://localhost:5000/swagger/`

> Subsequent builds are fast because Docker caches the pip install layer.

---

## Project Structure

```
read/
├── api/                  # Flask backend
│   ├── app.py            # App entry point, routes, Swagger config
│   ├── controllers/      # API route handlers
│   ├── services/         # Business logic (CEA engine, propellant data)
│   ├── docs/             # Swagger YAML definition
│   └── requirements.txt  # Python dependencies
├── ui/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/   # UI panels and visualizations
│   │   ├── services/     # API client
│   │   └── constants.ts  # Shared config (API base URL)
│   └── vite.config.ts    # Dev server + proxy config
└── Dockerfile            # 3-stage build: Node frontend → Python builder → lean runtime
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/propellants` | List available propellants |
| GET | `/api/v1/engine/design` | Run engine design calculation |

Full parameter reference available at `/swagger/`.
