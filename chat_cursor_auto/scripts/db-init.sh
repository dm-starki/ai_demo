#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PGPASSWORD="${POSTGRES_ADMIN_PASSWORD:-Change127}"
psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -f "$ROOT/back/sql/init_db.sql"
(cd "$ROOT/back" && yarn db:seed)
