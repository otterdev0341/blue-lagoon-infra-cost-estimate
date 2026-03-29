#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Blue Lagoon — Prerequisite Checker (macOS / Linux)
# Run: bash scripts/check-deps.sh
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Colour

PASS=0
FAIL=0

check() {
  local label="$1"
  local cmd="$2"
  local minver="$3"
  local install_hint="$4"

  if command -v "$cmd" &>/dev/null; then
    local ver
    ver=$("$cmd" --version 2>&1 | head -1)
    echo -e "  ${GREEN}✔${NC}  ${BOLD}${label}${NC}  ${CYAN}${ver}${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✘${NC}  ${BOLD}${label}${NC}  ${RED}NOT FOUND${NC}"
    echo -e "      ${YELLOW}→ Install: ${install_hint}${NC}"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Blue Lagoon — Prerequisite Check (macOS / Linux)   ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}Runtime & Package Managers${NC}"
check "Bun   (≥ 1.1 required)" "bun"  "1.1" "curl -fsSL https://bun.sh/install | bash"
check "Node  (≥ 18 required)"  "node" "18"  "https://nodejs.org  OR  nvm install 20"
check "npm   (bundled w/ Node)" "npm"  "9"   "Comes with Node.js"
echo ""

echo -e "${BOLD}Version Control${NC}"
check "Git" "git" "2" "https://git-scm.com/downloads"
echo ""

echo -e "${BOLD}Optional (production / Docker deploy)${NC}"
if command -v docker &>/dev/null; then
  ver=$(docker --version 2>&1 | head -1)
  echo -e "  ${GREEN}✔${NC}  ${BOLD}Docker${NC}  ${CYAN}${ver}${NC}"
else
  echo -e "  ${YELLOW}○${NC}  ${BOLD}Docker${NC}  ${YELLOW}not found — only needed for prod container builds${NC}"
  echo -e "      ${YELLOW}→ Install: https://docs.docker.com/get-docker/${NC}"
fi
echo ""

echo -e "${BOLD}Ports (must be free)${NC}"
for port in 3001 5173; do
  if lsof -i ":$port" &>/dev/null 2>&1; then
    echo -e "  ${RED}✘${NC}  Port ${BOLD}$port${NC}  ${RED}IN USE — free it before starting${NC}"
    lsof -i ":$port" | tail -n +2 | awk '{print "      PID " $2 "  " $1}'
    FAIL=$((FAIL + 1))
  else
    echo -e "  ${GREEN}✔${NC}  Port ${BOLD}$port${NC}  free"
    PASS=$((PASS + 1))
  fi
done
echo ""

echo -e "${BOLD}Summary${NC}"
echo -e "  Passed : ${GREEN}${PASS}${NC}"
echo -e "  Failed : ${RED}${FAIL}${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✔ All checks passed. You are ready to run:${NC}"
  echo ""
  echo -e "  ${CYAN}git clone https://github.com/your-org/blue-lagoon-infra-cost-estimate.git${NC}"
  echo -e "  ${CYAN}cd blue-lagoon-infra-cost-estimate${NC}"
  echo -e "  ${CYAN}./start.sh${NC}"
  echo ""
  echo -e "  Then open  ${BOLD}http://localhost:5173${NC}"
else
  echo -e "${RED}${BOLD}✘ Fix the issues above, then re-run this script.${NC}"
fi
echo ""
