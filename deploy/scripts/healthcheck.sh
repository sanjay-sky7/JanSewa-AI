#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost}"

echo "[INFO] Checking backend health endpoint"
curl -fsS "$BASE_URL/api/health" | sed 's/.*/[OK] backend health: &/'

echo "[INFO] Checking frontend root"
curl -fsS "$BASE_URL" > /dev/null
echo "[OK] frontend root is reachable"

echo "[DONE] Health checks passed"
