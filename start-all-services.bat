@echo off
echo ============================================================
echo Starting Financial ChatBot - All Services
echo ============================================================
echo.

:: Start Python AI Service first (document processing depends on it)
echo [1/3] Starting Python AI Service on port 5000...
start "Python AI Service" cmd /k "cd /d "%~dp0Python-Backend" && python start.py"

:: Wait longer for Python to initialise embedding model
timeout /t 8 /nobreak >nul

:: Start Node.js Backend
echo [2/3] Starting Node.js Backend on port 8000...
start "Node.js Backend" cmd /k "cd /d "%~dp0Backend" && npm run dev"
timeout /t 5 /nobreak >nul

:: Start React Frontend
echo [3/3] Starting React Frontend on port 5173...
start "React Frontend" cmd /k "cd /d "%~dp0Frontend" && npm run dev"

echo.
echo ============================================================
echo All services are starting!
echo ============================================================
echo.
echo Python AI Service:  http://localhost:5000
echo Node.js Backend:    http://localhost:8000
echo React Frontend:     http://localhost:5173
echo.
echo NOTE: The React dev server proxies /api requests to localhost:8000
echo       so cookies work correctly without cross-origin issues.
echo.
echo Press any key to close this window (services will keep running)...
pause >nul
