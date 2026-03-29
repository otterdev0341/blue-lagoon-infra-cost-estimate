@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  Blue Lagoon — Prerequisite Checker (Windows Command Prompt)
REM  Run: scripts\check-deps.bat
REM  (For a richer output use check-deps.ps1 instead)
REM ─────────────────────────────────────────────────────────────────────────────

set PASS=0
set FAIL=0

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║    Blue Lagoon — Prerequisite Check (Windows CMD)    ║
echo ╚══════════════════════════════════════════════════════╝
echo.

echo [Runtime and Package Managers]

where bun >nul 2>&1
if %ERRORLEVEL%==0 (
  echo   [OK]  Bun found
  bun --version
  set /a PASS+=1
) else (
  echo   [!!]  Bun NOT FOUND
  echo         Install: https://bun.sh  OR  npm install -g bun
  set /a FAIL+=1
)

where node >nul 2>&1
if %ERRORLEVEL%==0 (
  echo   [OK]  Node found
  node --version
  set /a PASS+=1
) else (
  echo   [!!]  Node NOT FOUND
  echo         Install: https://nodejs.org  OR  winget install OpenJS.NodeJS
  set /a FAIL+=1
)

where npm >nul 2>&1
if %ERRORLEVEL%==0 (
  echo   [OK]  npm found
  npm --version
  set /a PASS+=1
) else (
  echo   [!!]  npm NOT FOUND (comes with Node.js)
  set /a FAIL+=1
)

echo.
echo [Version Control]

where git >nul 2>&1
if %ERRORLEVEL%==0 (
  echo   [OK]  Git found
  git --version
  set /a PASS+=1
) else (
  echo   [!!]  Git NOT FOUND
  echo         Install: https://git-scm.com/download/win
  set /a FAIL+=1
)

echo.
echo [Optional - Docker]

where docker >nul 2>&1
if %ERRORLEVEL%==0 (
  echo   [OK]  Docker found
  docker --version
) else (
  echo   [ ]   Docker not found (only needed for production builds)
  echo         Install: https://docs.docker.com/desktop/install/windows-install/
)

echo.
echo [Ports]
echo   Checking port 3001...
netstat -ano | findstr ":3001 " >nul 2>&1
if %ERRORLEVEL%==0 (
  echo   [!!]  Port 3001 IN USE - free it before starting
  set /a FAIL+=1
) else (
  echo   [OK]  Port 3001 free
  set /a PASS+=1
)

echo   Checking port 5173...
netstat -ano | findstr ":5173 " >nul 2>&1
if %ERRORLEVEL%==0 (
  echo   [!!]  Port 5173 IN USE - free it before starting
  set /a FAIL+=1
) else (
  echo   [OK]  Port 5173 free
  set /a PASS+=1
)

echo.
echo [Summary]
echo   Passed: %PASS%
echo   Failed: %FAIL%
echo.

if %FAIL%==0 (
  echo All checks passed!
  echo.
  echo   git clone https://github.com/your-org/blue-lagoon-infra-cost-estimate.git
  echo   cd blue-lagoon-infra-cost-estimate
  echo.
  echo   Terminal 1 (Backend):
  echo     cd backend
  echo     bun install
  echo     bun run dev
  echo.
  echo   Terminal 2 (Frontend):
  echo     cd frontend
  echo     npm install
  echo     npm run dev
  echo.
  echo   Open: http://localhost:5173
) else (
  echo Fix the issues above, then re-run this script.
)
echo.
pause
