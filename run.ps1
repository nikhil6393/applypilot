# ApplyPilot - Full Stack Engine Launcher
[Console]::Title = "ApplyPilot - Full Stack Server (Frontend + Backend)"
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "              APPLYPILOT - AUTONOMOUS JOB PLATFORM" -ForegroundColor Cyan
Write-Host "         Full-Stack Server (Express API + Vite React Frontend)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\applypilot"

# 1. Clean Port 3000 if occupied
Write-Host "[1/3] Checking Port 3000..." -ForegroundColor Yellow
try {
    $connections = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $pidToKill = $conn.OwningProcess
            if ($pidToKill) {
                Write-Host "[Port 3000] Clearing previous process (PID $pidToKill)..." -ForegroundColor Yellow
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
        }
    }
} catch {}

# 2. Check dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[2/3] Installing dependencies, please wait..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "[2/3] Dependencies verified." -ForegroundColor Green
}

# 3. Detect Chrome / Default Browser
$ChromeCandidates = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$ChromeExe = $null
foreach ($p in $ChromeCandidates) {
    if (Test-Path $p) {
        $ChromeExe = $p
        break
    }
}

Write-Host "[3/3] Launching server at http://localhost:3000..." -ForegroundColor Green
Write-Host ""
Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  URL:         http://localhost:3000" -ForegroundColor White
Write-Host "  Admin Login: nikhil900285@gmail.com" -ForegroundColor White
Write-Host "  Password:    nikhil12" -ForegroundColor White
Write-Host "----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

# Background job to open browser as soon as server is ready
Start-Job -ScriptBlock {
    param($exe)
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Seconds 1
        try {
            $res = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 1
            if ($res.StatusCode -eq 200) {
                if ($exe) {
                    Start-Process $exe "http://localhost:3000"
                } else {
                    Start-Process "http://localhost:3000"
                }
                break
            }
        } catch {}
    }
} -ArgumentList $ChromeExe | Out-Null

npm run dev
