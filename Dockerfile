# ── Stage 1: Build React frontend ────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python backend ───────────────────────────────────
FROM python:3.11-slim AS backend

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create required dirs
RUN mkdir -p logs media staticfiles

# Collect static files
RUN python manage.py collectstatic --noinput --clear 2>/dev/null || true

# Non-root user for security
RUN useradd -m -u 1000 coldsync && chown -R coldsync:coldsync /app
USER coldsync

EXPOSE 10000

# Render uses PORT env variable — default 10000
CMD sh -c "python manage.py migrate --noinput && python manage.py shell -c \"from django.contrib.auth.models import User; User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@coldsync.com', 'Admin@1234')\" && gunicorn coldsync.wsgi:application --bind 0.0.0.0:${PORT:-10000} --workers 2 --threads 2 --timeout 120"
