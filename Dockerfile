# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build/ui
COPY ui/package.json ui/package-lock.json ./
RUN npm ci
COPY ui/ ./
RUN npm run build

# Stage 2: Python backend + serve static frontend
FROM python:3.11-slim AS runtime

# gfortran + gcc + make required by rocketcea to compile NASA CEA Fortran code.
# libgfortran is also needed at runtime (the compiled .so links to it) — do NOT uninstall.
RUN apt-get update && \
    apt-get install -y --no-install-recommends gfortran gcc make && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# requirements.txt copied before source so pip install is cached unless deps change.
# First build takes ~10-15 min (rocketcea compiles Fortran); subsequent builds are instant.
COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./
COPY --from=frontend-builder /build/ui/dist ./ui/dist

ENV FLASK_DEBUG=0
EXPOSE 5000
CMD ["python", "app.py"]
