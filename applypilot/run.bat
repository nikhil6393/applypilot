@echo off
setlocal enabledelayedexpansion
title ApplyPilot - Full Stack Engine (Frontend + Backend)
color 0B

echo ================================================================
echo               APPLYPILOT - AUTONOMOUS JOB PLATFORM
echo          Full-Stack Server (Express API + Vite React Frontend)
echo ================================================================
echo.

cd /d "%~dp0"

:: 1. Free port 3000 if already occupied by an old process
echo [1/3] Checking port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [Port 3000] Clearing previous process PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Check dependencies
if not exist node_modules (
    echo [2/3] Installing dependencies, please wait...
    call npm install
) else (
    echo [2/3] Dependencies verified.
)

:: 3. Detect Chrome or Default Browser to auto-open
set "CHROME_EXE="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

echo [3/3] Launching integrated server at http://localhost:3000...
echo.
echo ----------------------------------------------------------------
echo   URL:         http://localhost:3000
echo   Admin Login: nikhil900285@gmail.com
echo   Password:    nikhil12
echo ----------------------------------------------------------------
echo.

:: Launch auto-opener in background (polls until server is live)
if defined CHROME_EXE (
    start "" /b powershell -NoProfile -Command "for ($i=0; $i -lt 40; $i++) { Start-Sleep -Seconds 1; try { $res = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 1; if ($res.StatusCode -eq 200) { Start-Process '%CHROME_EXE%' 'http://localhost:3000'; break } } catch {} }"
) else (
    start "" /b powershell -NoProfile -Command "for ($i=0; $i -lt 40; $i++) { Start-Sleep -Seconds 1; try { $res = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 1; if ($res.StatusCode -eq 200) { Start-Process 'http://localhost:3000'; break } } catch {} }"
)

:: Start Full Stack Server (Node backend + Vite HMR frontend)
call npm run dev

pause
