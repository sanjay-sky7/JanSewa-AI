#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/JanSewa-AI}"
BRANCH="${BRANCH:-main}"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "[ERROR] APP_DIR does not look like a git repository: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

echo "[INFO] Pulling latest code from $BRANCH"
git fetch origin
git checkout "$BRANCH"
git pull --rebase origin "$BRANCH"

echo "[INFO] Validating required env file"
if [ ! -f backend/.env ]; then
  echo "[ERROR] backend/.env not found. Create it from backend/.env.example first."
  exit 1
fi

echo "[INFO] Building and starting production stack"
docker compose -f deploy/docker-compose.prod.yml up -d --build

echo "[INFO] Current container status"
docker compose -f deploy/docker-compose.prod.yml ps

echo "[DONE] Deployment completed"
