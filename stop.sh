#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# stop.sh  —  AWS Infra Canvas
# Gracefully stops backend and frontend servers started by start.sh.
# Usage:  ./stop.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDS_FILE="$ROOT/.pids"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
info() { echo -e "${GREEN}▶${RESET}  $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
err()  { echo -e "${RED}✖${RESET}  $*" >&2; }

if [ ! -f "$PIDS_FILE" ]; then
  warn "No .pids file found. Servers may not be running."

  # Fallback: kill by port in case .pids was lost
  for PORT in 3001 5173; do
    PID=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
    if [ -n "$PID" ]; then
      warn "Found process on port $PORT (PID $PID) — killing."
      kill "$PID" 2>/dev/null || true
    fi
  done
  exit 0
fi

NAMES=("backend (port 3001)" "frontend (port 5173)")
INDEX=0
FAILED=0

while IFS= read -r PID; do
  if [ -z "$PID" ]; then continue; fi
  NAME="${NAMES[$INDEX]:-process}"
  INDEX=$((INDEX + 1))

  if kill -0 "$PID" 2>/dev/null; then
    info "Stopping $NAME (PID $PID)…"
    kill "$PID" 2>/dev/null || true

    # Wait up to 5 s for graceful shutdown
    for _ in $(seq 1 10); do
      sleep 0.5
      kill -0 "$PID" 2>/dev/null || break
    done

    # Force kill if still alive
    if kill -0 "$PID" 2>/dev/null; then
      warn "$NAME did not stop gracefully — sending SIGKILL."
      kill -9 "$PID" 2>/dev/null || true
      FAILED=$((FAILED + 1))
    fi
  else
    warn "$NAME (PID $PID) was not running."
  fi
done < "$PIDS_FILE"

rm -f "$PIDS_FILE"

if [ "$FAILED" -gt 0 ]; then
  err "$FAILED process(es) had to be force-killed."
else
  echo -e "\n${GREEN}✅  All servers stopped.${RESET}\n"
fi
