@echo off
title TempoWorkers - 1-Click Launch
color 0A

echo ==============================================================
echo        TEMPOWORKERS - HYPERLOCAL GIG WORKFORCE PLATFORM
echo ==============================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo [1/3] Starting Backend Server (Port 5000)...
start "TempoWorkers Server" cmd /k "cd server && npm run dev"

echo [2/3] Starting Frontend Client (Port 5173)...
start "TempoWorkers Client" cmd /k "cd client && npm run dev"

echo [3/3] Waiting for services to initialize...
timeout /t 4 /nobreak >nul

echo Opening browser...
start http://localhost:5173

echo.
echo ==============================================================
echo [SUCCESS] TempoWorkers is running!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000/api
echo.
echo Demo Accounts:
echo - Admin:    admin@tempoworkers.com / Tempo@1234
echo - Employer: vikram@apexinfra.com   / Tempo@1234
echo - Worker:   9811223344 (OTP Login)
echo ==============================================================
pause
