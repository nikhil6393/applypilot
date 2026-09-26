@echo off
title ApplyPilot Server (Frontend + Backend)
color 0A

echo ================================================================
echo             APPLYPILOT - SERVER LAUNCHER
echo      Running Full-Stack (Backend API + Frontend UI)
echo ================================================================
echo.

:: 1. Navigate to applypilot folder
cd /d "%~dp0applypilot"
echo [1/3] Working directory set to: %CD%

:: 2. Auto-kill any old process holding port 3000
echo [2/3] Checking Port 3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess; if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Host 'Port 3000 freed successfully.' -ForegroundColor Yellow }"

:: 3. Launch auto-opener in background (opens browser once server responds)
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($i=0; $i -lt 40; $i++) { Start-Sleep -Seconds 1; try { $res = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 1; if ($res.StatusCode -eq 200) { Start-Process 'http://localhost:3000'; break } } catch {} }"

echo [3/3] Starting server on http://localhost:3000...
echo.
echo ================================================================
echo   URL:         http://localhost:3000
echo   Admin Login: nikhil900285@gmail.com
echo   Password:    nikhil12
echo ================================================================
echo.
echo Press Ctrl+C in this window anytime to stop the server.
echo.

:: 4. Start the server
call npm run dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Server exited with code %ERRORLEVEL%.
)

pause
