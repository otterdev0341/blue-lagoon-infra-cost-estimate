#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh  —  Blue Lagoon Infra Cost Estimator
#
# Installs deps and starts both backend (bun) + frontend (Vite) servers.
# DB selection is automatic:
#   • MONGODB_URI set  → MongoDB (production/cloud)
#   • MONGODB_URI unset → bun:sqlite at backend/data/app.db (local dev, zero config)
#
# Usage:  ./start.sh
# Stop:   ./stop.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDS_FILE="$ROOT/.pids"
LOG_DIR="$ROOT/.logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# ── colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'; BOLD='\033[1m'
info()    { echo -e "${GREEN}▶${RESET}  $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
err()     { echo -e "${RED}✖${RESET}  $*" >&2; }
section() { echo -e "\n${BOLD}$*${RESET}"; }

# ── guard: already running ───────────────────────────────────────────────────
if [ -f "$PIDS_FILE" ]; then
  warn "Servers may already be running (.pids file exists)."
  warn "Run ./stop.sh first, or delete .pids manually."
  exit 1
fi

# ── locate bun ───────────────────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  if [ -x "$HOME/.bun/bin/bun" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
  else
    err "bun not found. Install from https://bun.sh"
    exit 1
  fi
fi
info "bun $(bun --version)"

# ── locate npm ───────────────────────────────────────────────────────────────
NPM_BIN=""
for _c in \
    "$(command -v npm 2>/dev/null)" \
    /usr/local/bin/npm \
    /opt/homebrew/bin/npm \
    "$HOME/.nvm/versions/node/"*/bin/npm; do
  if [ -x "$_c" ]; then NPM_BIN="$_c"; break; fi
done

install_deps() {
  local DIR="$1" NAME="$2"
  info "Installing $NAME deps via npm…"
  if [ -z "$NPM_BIN" ]; then
    err "npm not found. Install Node: https://nodejs.org"
    exit 1
  fi
  (cd "$DIR" && "$NPM_BIN" install --no-package-lock --no-workspaces --loglevel=error)
  info "$NAME deps ready."
}

mkdir -p "$LOG_DIR"

# ── 1. install dependencies ──────────────────────────────────────────────────
section "1/3  Dependencies"

if [ ! -d "$ROOT/backend/node_modules" ]; then
  install_deps "$ROOT/backend" "backend"
else
  info "Backend deps already installed."
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  install_deps "$ROOT/frontend" "frontend"
else
  info "Frontend deps already installed."
fi

# ── 2. database setup ────────────────────────────────────────────────────────
section "2/3  Database"

if [ -n "${MONGODB_URI:-}" ]; then
  info "MONGODB_URI is set → will use MongoDB"
else
  DB_PATH="${SQLITE_PATH:-$ROOT/backend/data/app.db}"
  DB_DIR="$(dirname "$DB_PATH")"
  mkdir -p "$DB_DIR"
  if [ -f "$DB_PATH" ]; then
    info "SQLite database found: $DB_PATH"
  else
    info "SQLite database will be created on first run: $DB_PATH"
  fi
fi

# ── 3. start servers ─────────────────────────────────────────────────────────
section "3/3  Starting servers"

info "Starting backend  (log → $BACKEND_LOG)"
(cd "$ROOT/backend" && bun run dev >> "$BACKEND_LOG" 2>&1) &
BACKEND_PID=$!

info "Starting frontend (log → $FRONTEND_LOG)"
(cd "$ROOT/frontend" && "${NPM_BIN:-npm}" run dev >> "$FRONTEND_LOG" 2>&1) &
FRONTEND_PID=$!

# Wait a moment to catch immediate crashes
sleep 2

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  err "Backend crashed on startup. Check $BACKEND_LOG"
  kill "$FRONTEND_PID" 2>/dev/null || true
  exit 1
fi
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
  err "Frontend crashed on startup. Check $FRONTEND_LOG"
  kill "$BACKEND_PID" 2>/dev/null || true
  exit 1
fi

# Persist PIDs
printf '%s\n%s\n' "$BACKEND_PID" "$FRONTEND_PID" > "$PIDS_FILE"

# ── summary ───────────────────────────────────────────────────────────────────
DB_LABEL="${MONGODB_URI:+MongoDB}"
DB_LABEL="${DB_LABEL:-SQLite (${SQLITE_PATH:-backend/data/app.db})}"

echo ""
echo -e "${GREEN}${BOLD}✅  Both servers running${RESET}"
echo ""
echo -e "   🌐  Frontend  →  ${BOLD}http://localhost:5173${RESET}"
echo -e "   ⚙️   Backend   →  ${BOLD}http://localhost:3001${RESET}"
echo -e "   🗄   Database  →  ${BOLD}$DB_LABEL${RESET}"
echo ""
echo -e "   Logs:  tail -f $LOG_DIR/*.log"
echo -e "   Stop:  ./stop.sh"
echo ""
