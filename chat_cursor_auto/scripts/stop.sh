#!/usr/bin/env bash
set -euo pipefail
for p in 5101 5102 5103; do
  if command -v lsof >/dev/null 2>&1; then
    PIDS="$(lsof -ti tcp:"$p" || true)"
    if [[ -n "${PIDS}" ]]; then
      kill -9 ${PIDS} 2>/dev/null || true
    fi
  fi
done
