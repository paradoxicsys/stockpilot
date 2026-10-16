#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  alembic upgrade head
fi

if [ "${SEED_DATA:-false}" = "true" ]; then
  python -m app.seed
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*' "$@"
