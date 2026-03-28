#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh  —  AWS Infra Canvas
# Installs deps, generates + applies Drizzle migrations, starts both servers.
# Usage:  ./start.sh
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
# bun install has a broken tempdir on this machine (bun #9887).
# We use npm for package installation; bun is still used to run the servers.
NPM_BIN=""
for _c in \
    "$(command -v npm 2>/dev/null)" \
    /usr/local/bin/npm \
    /opt/homebrew/bin/npm \
    "$HOME/.nvm/versions/node/"*/bin/npm; do
  if [ -x "$_c" ]; then NPM_BIN="$_c"; break; fi
done

# install_deps DIR NAME
# Uses npm install --no-package-lock so it installs directly into DIR/node_modules
# without being influenced by any parent workspace package.json.
install_deps() {
  local DIR="$1" NAME="$2"
  info "Installing $NAME deps via npm…"
  if [ -z "$NPM_BIN" ]; then
    err "npm not found. Install Node: https://nodejs.org"
    exit 1
  fi
  # --no-package-lock    → don't create/use npm lockfile (bun.lockb is the source of truth)
  # --no-workspaces      → ignore parent workspace config, install into this dir only
  # --loglevel=error     → suppress noisy npm output
  (cd "$DIR" && "$NPM_BIN" install --no-package-lock --no-workspaces --loglevel=error)
  info "$NAME deps ready."
}

mkdir -p "$LOG_DIR"

# ── 1. install dependencies ──────────────────────────────────────────────────
section "1/4  Dependencies"

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

# ── 2. ensure data directory ─────────────────────────────────────────────────
section "2/4  Database directory"

DB_PATH="${SQLITE_PATH:-$ROOT/backend/data/app.db}"
DB_DIR="$(dirname "$DB_PATH")"
mkdir -p "$DB_DIR"

if [ -f "$DB_PATH" ]; then
  info "Database found: $DB_PATH"
else
  warn "Database not found — will be created by migration."
fi

# ── 3. generate & apply Drizzle migrations ───────────────────────────────────
section "3/4  Drizzle migrations"

DRIZZLE_DIR="$ROOT/backend/drizzle"

if [ ! -d "$DRIZZLE_DIR" ] || [ -z "$(ls -A "$DRIZZLE_DIR" 2>/dev/null)" ]; then
  info "No migration files found — generating from schema…"
  (cd "$ROOT/backend" && SQLITE_PATH="$DB_PATH" bun run db:generate)
else
  info "Migration files exist in drizzle/"
fi

info "Applying migrations…"
(cd "$ROOT/backend" && SQLITE_PATH="$DB_PATH" bun run db:migrate)
info "Database is up to date."

# ── 4. start servers ─────────────────────────────────────────────────────────
section "4/4  Starting servers"

info "Starting backend  (log → $BACKEND_LOG)"
(cd "$ROOT/backend" && SQLITE_PATH="$DB_PATH" bun run dev >> "$BACKEND_LOG" 2>&1) &
BACKEND_PID=$!

info "Starting frontend (log → $FRONTEND_LOG)"
(cd "$ROOT/frontend" && bun run dev >> "$FRONTEND_LOG" 2>&1) &
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
echo ""
echo -e "${GREEN}${BOLD}✅  Both servers running${RESET}"
echo ""
echo -e "   🌐  Frontend  →  ${BOLD}http://localhost:5173${RESET}"
echo -e "   ⚙️   Backend   →  ${BOLD}http://localhost:3001${RESET}"
echo -e "   🗄   Database  →  ${BOLD}$DB_PATH${RESET}"
echo ""
echo -e "   Logs:  tail -f $LOG_DIR/*.log"
echo -e "   Stop:  ./stop.sh"
echo ""
