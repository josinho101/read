# READ — Rocket Engine Analysis & Design

A web-based rocket engine design tool. Input a propellant pair and thrust requirements; get back full thermochemistry, engine geometry, and a 3D nozzle contour — powered by NASA CEA via the [rocketcea](https://rocketcea.readthedocs.io/) library.

## Features

- Select oxidizer/fuel pair from a built-in propellant database
- Set chamber pressure, exit pressure, and target thrust
- Sweep O/F ratio range to find optimal mixture ratio
- View engine contour (chamber + nozzle geometry)
- Interactive O/F ratio vs. performance graphs
- Injector orifice sizing sweep — hydraulic analysis across ΔP range for six injector architectures (impinging doublet, FOF/OFO triplet, coaxial, showerhead, pintle)
- Save, load, update, and delete named engine designs (persistent storage)
- Parameter reference panel with 80+ terms: symbols, units, and physics descriptions
- Thrust-to-Weight Ratio (TWR) / Lift-of-Mass calculator for mission mass budgeting
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

Before building, set the app version in `ui/.env`:

```
VITE_APP_VERSION=0.0.1
```

```bash
# Build the image (first build takes ~10–15 minutes — rocketcea compiles Fortran)
docker build -t read-app:0.0.1 .

# Run the container
docker run -d -p 5000:5000 read-app:0.0.1
```

Open `http://localhost:5000` in your browser.

API docs: `http://localhost:5000/swagger/`

> Subsequent builds are fast because Docker caches the pip install layer.

### Using Docker Compose

A `docker-compose.yml` is provided at the repo root. It builds the same image, maps port 5000, loads environment variables from `api/.env`, and mounts `./api/saved_engines` and `./secrets` (used for Firebase credentials — see below).

```bash
# Build the image via Compose
docker compose build

# Start the container (detached)
docker compose up -d

# ...or build and start in one step
docker compose up -d --build

# Stop the container
docker compose down
```

The default `docker-compose.yml` at the repo root is picked up automatically. To use a different file or run from another directory, pass `-f`:

```bash
docker compose -f docker-compose.yml up -d
# or, from a different working directory:
docker compose -f /path/to/read/docker-compose.yml up -d
```

---

## Storage Configuration

Saved engine designs (`/api/v1/engines*`) can be persisted using one of two backends, selected via the `STORAGE_TYPE` variable in `api/.env`:

| `STORAGE_TYPE` | Backend | Notes |
|----------------|---------|-------|
| `local-disk` (default) | JSON files under `ENGINE_STORAGE_PATH` (`./saved_engines`) | No setup required |
| `firebase` | Firestore collection (`FIRESTORE_COLLECTION`, default `engines`) | Requires a Firebase project + service account credentials |

### Firebase / Firestore Setup

To use `STORAGE_TYPE=firebase`, you need a Firebase project with Firestore enabled and a service account key file.

1. **Create a Firebase project**
   - Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add project** (or select an existing project).
   - Follow the prompts to create the project (Google Analytics is optional).

2. **Enable Firestore**
   - In the project, open **Build → Firestore Database** in the left sidebar.
   - Click **Create database**, choose **Native mode**, pick a location, and confirm.

3. **Download a service account key**
   - Click the gear icon next to **Project Overview** → **Project settings**.
   - Go to the **Service accounts** tab.
   - Ensure **Firebase Admin SDK** is selected, then click **Generate new private key**.
   - Confirm the dialog — this downloads a JSON file (e.g. `your-project-12345-firebase-adminsdk-xxxxx.json`).

4. **Place the credentials file in the project**
   - Create a `secrets/` directory at the repo root (already in `.gitignore`, so it won't be committed).
   - Move/rename the downloaded file to `secrets/firebase-service-account.json`.

5. **Configure `api/.env`**
   ```
   STORAGE_TYPE=firebase
   FIRESTORE_COLLECTION=engines
   GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-service-account.json
   ```
   - When running via `docker compose`, the `secrets/` folder is mounted into the container at `/app/secrets`, so use:
     ```
     GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/firebase-service-account.json
     ```

6. **Run the app** — engine designs will now be read from/written to the `engines` collection in Firestore instead of `saved_engines/`.

To switch back to local JSON storage at any time, set `STORAGE_TYPE=local-disk` (or remove the variable).

---

## Project Structure

```
read/
├── api/                              # Flask backend
│   ├── app.py                        # App entry point, route registration, Swagger config
│   ├── controllers/
│   │   ├── propellants_controller.py # GET /api/v1/propellants
│   │   ├── engine_controller.py      # GET /api/v1/engine/design
│   │   ├── engine_storage_controller.py  # CRUD /api/v1/engines
│   │   └── injector_controller.py    # GET /api/v1/injector/sweep
│   ├── services/
│   │   ├── cea.py                    # NASA CEA wrapper (thermochemistry + geometry)
│   │   ├── propellants_service.py    # Propellant database
│   │   ├── engine_storage_service.py # JSON file persistence for saved engines
│   │   └── injector.py               # Injector hydraulic sweep calculations
│   ├── docs/
│   │   └── swagger.yml               # OpenAPI 2.0 definition
│   ├── saved_engines/                # Persisted engine JSON files
│   └── requirements.txt
├── ui/                               # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── leftPanel/            # Propellant & parameter inputs
│   │   │   ├── mainContent/          # Tab container (5 tabs)
│   │   │   ├── engineContour/        # 3D nozzle contour visualization
│   │   │   ├── engineContourRightPanel/  # Contour controls & geometry display
│   │   │   ├── injectorFace/         # Injector face 2D visualization
│   │   │   ├── injectorRightPanel/   # Injector sweep controls & results table
│   │   │   ├── combustionAnalysis/   # O/F sweep performance graphs
│   │   │   ├── mrGraph/              # Mixture ratio graph widget
│   │   │   ├── reference/            # Parameter reference & TWR calculator
│   │   │   ├── savedEnginesModal/    # Save/load engine designs modal
│   │   │   ├── confirmDialog/        # Generic confirmation dialog
│   │   │   ├── header/
│   │   │   └── footer/
│   │   ├── services/                 # Typed API clients
│   │   │   ├── engineDesignService.ts
│   │   │   ├── engineStorageService.ts
│   │   │   ├── injectorSweepService.ts
│   │   │   └── propellantService.ts
│   │   └── constants.ts              # Shared config (API base URL)
│   └── vite.config.ts                # Dev server + proxy config
└── Dockerfile                        # 3-stage build: Node frontend → Python builder → lean runtime
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/propellants` | List available propellants |
| GET | `/api/v1/engine/design` | Run engine design calculation |
| GET | `/api/v1/engines` | List all saved engine designs |
| POST | `/api/v1/engines` | Save a new engine design |
| GET | `/api/v1/engines/<name>/<version>` | Retrieve a saved engine design |
| PUT | `/api/v1/engines/<name>/<version>` | Update a saved engine design |
| DELETE | `/api/v1/engines/<name>/<version>` | Delete a saved engine design |
| GET | `/api/v1/injector/sweep` | Injector orifice hydraulic sweep |

Full parameter reference available at `/swagger/`.
