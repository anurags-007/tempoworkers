# TempoWorkers 1-Click Launch Script for PowerShell
$ErrorActionPreference = "Stop"

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "       TEMPOWORKERS - HYPERLOCAL GIG WORKFORCE PLATFORM        " -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/3] Launching Express Server (Port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\server'; npm run dev"

Write-Host "[2/3] Launching Vite Client (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\client'; npm run dev"

Write-Host "[3/3] Initializing services..." -ForegroundColor Cyan
Start-Sleep -Seconds 4

Write-Host "Opening web browser at http://localhost:5173..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "TempoWorkers is live and ready for testing!" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:5000/api" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Green
