#!/usr/bin/env bash
# TallyTrove — Ubuntu VPS deploy script (test branch).
# Run on the VPS in /opt/tallytrove.
#
# Usage:
#   ./deploy/deploy.sh
#
# What it does:
#   1. Pulls latest origin/test from GitHub
#   2. Rebuilds + restarts the 4-service stack (db, backend, storefront, admin)
#   3. Waits for services to settle
#   4. Smoke-tests storefront, admin, and backend
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"
echo "[deploy] repo root: $REPO_ROOT"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "test" ]]; then
  echo "[deploy] ERROR: expected branch 'test', got '$CURRENT_BRANCH'." >&2
  echo "[deploy]        run:  git checkout test && ./deploy/deploy.sh" >&2
  exit 1
fi

echo "[deploy] pulling latest origin/test…"
git fetch --prune origin
git pull --ff-only origin test

echo "[deploy] rebuilding + restarting stack…"
docker compose up -d --build

echo "[deploy] waiting 10s for services to settle…"
sleep 10

echo "[deploy] service status:"
docker compose ps

echo "[deploy] smoke tests:"
echo -n "  storefront :12095/  → "
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:12095/ || true
echo -n "  admin      :12096/  → "
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:12096/ || true
echo -n "  backend    :12097/  → "
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:12097/ || true
echo -n "  backend health      → "
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:12097/health 2>/dev/null || curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:12097/docs || true

echo "[deploy] done."
