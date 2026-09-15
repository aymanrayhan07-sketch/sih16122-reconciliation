@echo off
title SIH16122 Offline Stage Demo Launcher
color 0b

echo ======================================================================
echo   [SIH16122] AI Construction Progress Reconciliation System
echo   STAGE DEMO MODE: 100%% Local - Zero Internet Required
echo ======================================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

set HF_HUB_OFFLINE=1
set TRANSFORMERS_OFFLINE=1

echo [1/3] Starting Local AI Backend (FastAPI + SQLite)...
start "SIH16122 Backend" /min cmd /c "cd /d "%ROOT_DIR%backend" && python run_backend.py"

echo [2/3] Starting Local Frontend (React + Vite)...
start "SIH16122 Frontend" /min cmd /c "cd /d "%ROOT_DIR%frontend" && npm.cmd run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo.
echo Launching Web Browser at http://localhost:5173 ...
start "" "http://localhost:5173"

echo.
echo ======================================================================
echo   STAGE DEMO IS RUNNING LIVE AT: http://localhost:5173
echo   Everything runs 100%% offline on your local machine.
echo ======================================================================
echo.
echo Press any key when you are done to stop all servers...
pause >nul

echo Stopping servers...
taskkill /fi "WINDOWTITLE eq SIH16122 Backend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq SIH16122 Frontend*" /f >nul 2>&1
echo Done.
