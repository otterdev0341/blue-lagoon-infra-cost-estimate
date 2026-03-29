# ─────────────────────────────────────────────────────────────────────────────
# Blue Lagoon — Prerequisite Checker (Windows PowerShell)
# Run: pwsh -ExecutionPolicy Bypass -File scripts\check-deps.ps1
#   OR: powershell -ExecutionPolicy Bypass -File scripts\check-deps.ps1
# ─────────────────────────────────────────────────────────────────────────────

$pass = 0
$fail = 0

function Check-Tool {
  param(
    [string]$Label,
    [string]$Command,
    [string]$InstallHint
  )
  $found = Get-Command $Command -ErrorAction SilentlyContinue
  if ($found) {
    $ver = & $Command --version 2>&1 | Select-Object -First 1
    Write-Host "  [OK]  $Label  $ver" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  [!!]  $Label  NOT FOUND" -ForegroundColor Red
    Write-Host "        -> Install: $InstallHint" -ForegroundColor Yellow
    $script:fail++
  }
}

function Check-Port {
  param([int]$Port)
  $inUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
  if ($inUse) {
    Write-Host "  [!!]  Port $Port  IN USE — free it before starting" -ForegroundColor Red
    $inUse | ForEach-Object {
      $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
      Write-Host "        PID $($_.OwningProcess)  $($proc.Name)" -ForegroundColor Yellow
    }
    $script:fail++
  } else {
    Write-Host "  [OK]  Port $Port  free" -ForegroundColor Green
    $script:pass++
  }
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Blue Lagoon — Prerequisite Check (Windows)       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Runtime & Package Managers" -ForegroundColor White
Check-Tool "Bun   (>= 1.1 required)" "bun"  "https://bun.sh  (Windows: via npm — npm install -g bun)"
Check-Tool "Node  (>= 18 required)"  "node" "https://nodejs.org  OR  winget install OpenJS.NodeJS"
Check-Tool "npm   (bundled w/ Node)" "npm"  "Comes with Node.js"
Write-Host ""

Write-Host "Version Control" -ForegroundColor White
Check-Tool "Git" "git" "https://git-scm.com/download/win  OR  winget install Git.Git"
Write-Host ""

Write-Host "Optional (production / Docker deploy)" -ForegroundColor White
$dockerFound = Get-Command "docker" -ErrorAction SilentlyContinue
if ($dockerFound) {
  $ver = & docker --version 2>&1 | Select-Object -First 1
  Write-Host "  [OK]  Docker  $ver" -ForegroundColor Green
} else {
  Write-Host "  [ ]   Docker  not found — only needed for prod container builds" -ForegroundColor Yellow
  Write-Host "        -> Install: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Ports (must be free)" -ForegroundColor White
Check-Port 3001
Check-Port 5173
Write-Host ""

Write-Host "Summary" -ForegroundColor White
Write-Host "  Passed : $pass" -ForegroundColor Green
Write-Host "  Failed : $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($fail -eq 0) {
  Write-Host "All checks passed. You are ready to run:" -ForegroundColor Green
  Write-Host ""
  Write-Host "  git clone https://github.com/your-org/blue-lagoon-infra-cost-estimate.git" -ForegroundColor Cyan
  Write-Host "  cd blue-lagoon-infra-cost-estimate" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "  # Backend (Terminal 1)" -ForegroundColor Gray
  Write-Host "  cd backend && bun install && bun run dev" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "  # Frontend (Terminal 2)" -ForegroundColor Gray
  Write-Host "  cd frontend && npm install && npm run dev" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "  Then open  http://localhost:5173" -ForegroundColor White
} else {
  Write-Host "Fix the issues above, then re-run this script." -ForegroundColor Red
}
Write-Host ""
