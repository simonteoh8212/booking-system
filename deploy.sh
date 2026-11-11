#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="web"
ENV_FILE=".env.prod"
BRANCH="main"
DB_CONTAINER="postgres-db"

RUN_SEED=false
SKIP_PULL=false

for arg in "$@"; do
  case "$arg" in
    --seed) RUN_SEED=true ;;
    --no-pull) SKIP_PULL=true ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: ./deploy.sh [--seed] [--no-pull]"
      exit 1
      ;;
  esac
done

# Ensure script runs from repo root
cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Copy .env.prod.example to $ENV_FILE first."
  exit 1
fi

if ! grep -qE '^DIRECT_URL=' "$ENV_FILE"; then
  echo "Error: DIRECT_URL is missing in $ENV_FILE (required by prisma/schema.prisma)."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "Error: Shared database container '$DB_CONTAINER' is not running."
  echo "Start ~/florist-white-label-frontend first."
  exit 1
fi

echo "=========================================="
echo "Starting Salon production deployment (${SERVICE_NAME})..."
echo "=========================================="

if [ "$SKIP_PULL" = false ]; then
  echo "[1/4] Pulling latest commits from origin/${BRANCH}..."
  git pull origin "$BRANCH"
  echo "[1/4] Git pull completed."
else
  echo "[1/4] Skipping git pull (--no-pull)."
fi

echo "[2/4] Rebuilding and restarting ${SERVICE_NAME} container..."
# Note: Dockerfile CMD runs prisma migrate deploy / db push automatically on startup
docker compose --env-file "$ENV_FILE" up -d --build "$SERVICE_NAME"

if [ "$RUN_SEED" = true ]; then
  echo "[3/4] Running database seed into salon_db..."
  docker compose --env-file "$ENV_FILE" exec -T "$SERVICE_NAME" node prisma/seed.js
else
  echo "[3/4] Skipping database seed (pass --seed on first deploy if needed)."
fi

echo "[4/4] Pruning dangling Docker images..."
docker image prune -f

echo "=========================================="
echo "Container status:"
docker compose --env-file "$ENV_FILE" ps
echo "Deployment completed successfully!"
echo "=========================================="
