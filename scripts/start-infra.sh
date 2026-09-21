#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi
cd "$ROOT/deployment/docker"
docker compose --env-file "$ROOT/.env" up -d
echo "Optional local Postgres is starting on port ${DB_PORT:-5433} (default app DB is pg18:6432)"
