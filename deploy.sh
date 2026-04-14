#!/bin/bash
# ColdSync Pro — Docker deployment script
# Usage: ./deploy.sh [--build]

set -e

echo "🚀 ColdSync Pro — Deploying..."

# Check .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found! Copy .env.production.example to .env and fill in values."
  exit 1
fi

# Build flag
if [ "$1" == "--build" ]; then
  echo "🔨 Building Docker images..."
  docker compose build --no-cache
fi

echo "⬆️  Starting services..."
docker compose up -d

echo "⏳ Waiting for DB to be ready..."
sleep 5

echo "🗄️  Running migrations..."
docker compose exec web python manage.py migrate --noinput

echo "📦 Collecting static files..."
docker compose exec web python manage.py collectstatic --noinput --clear

echo "🛍️  Rebuilding product catalog (if needed)..."
docker compose exec web python manage.py rebuild_shop 2>/dev/null || echo "  (rebuild_shop skipped — run manually if needed)"

echo "✅ Deployment complete!"
echo ""
echo "📋 Service status:"
docker compose ps
echo ""
echo "📝 Logs: docker compose logs -f web"
