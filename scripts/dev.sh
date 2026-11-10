#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

trap 'kill 0' EXIT

echo "Starting Backend Laravel on http://localhost:8000 ..."
(cd "$ROOT_DIR/backend" && php artisan serve --host=127.0.0.1 --port=8000) &

echo "Starting Frontend Next.js on http://localhost:3000 ..."
(cd "$ROOT_DIR/frontend" && npm run dev) &

wait
