# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build/ui
COPY ui/package.json ui/package-lock.json ./
RUN npm ci
COPY ui/ ./
RUN npm run build

# Stage 2: Compile Python deps (gfortran + gcc stay isolated here)
# rocketcea compiles NASA CEA Fortran code at pip install time — ~10-15 min on first build.
FROM python:3.11-slim AS python-builder
RUN apt-get update && \
    apt-get install -y --no-install-recommends gfortran gcc make && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY api/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 3: Lean runtime — no compilers, only libgfortran5 (rocketcea .so links to it at runtime)
FROM python:3.11-slim AS runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgfortran5 && \
    rm -rf /var/lib/apt/lists/*
COPY --from=python-builder /install /usr/local
WORKDIR /app
COPY api/ ./
COPY --from=frontend-builder /build/ui/dist ./ui/dist
ENV FLASK_DEBUG=0
EXPOSE 5000
CMD ["python", "app.py"]
