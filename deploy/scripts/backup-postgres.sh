#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/JanSewa-AI}"
BACKUP_DIR="${BACKUP_DIR:-/opt/JanSewa-AI/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/jansewa_db_$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

echo "[INFO] Creating postgres backup: $FILE"
docker compose -f deploy/docker-compose.prod.yml exec -T postgres \
  pg_dump -U jansewa -d jansewa_db > "$FILE"

echo "[DONE] Backup created: $FILE"
