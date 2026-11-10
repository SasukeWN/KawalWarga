#!/usr/bin/env bash
# ============================================================================
# KawalWarga — Reset Demo Database & Seeders (Bash)
# ============================================================================
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Mereset dan melakukan seeding ulang database demo..."
(cd "$ROOT_DIR/backend" && php artisan migrate:fresh --seed)
echo "Database demo berhasil direset ke kondisi awal (204 laporan demo siap)!"
