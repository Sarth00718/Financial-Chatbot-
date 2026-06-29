@echo off
echo ============================================================
echo Starting Financial ChatBot - All Services
echo ============================================================
echo.

:: Start Python AI Service
echo [1/3] Starting Python AI Service on port 5000...
start "Python AI Service" cmd /k "cd Python-Backend && python start.py"
timeout /t 5 /nobreak >nul

:: Start Node.js Backend
echo [2/3] Starting Node.js Backend on port 8000...
start "Node.js Backend" cmd /k "cd Backend && npm run dev"
timeout /t 5 /nobreak >nul

:: Start React Frontend
echo [3/3] Starting React Frontend on port 5173...
start "React Frontend" cmd /k "cd Frontend && npm run dev"

echo.
echo ============================================================
echo All services are starting!
echo ============================================================
echo.
echo Python AI Service:  http://localhost:5000
echo Node.js Backend:    http://localhost:8000
echo React Frontend:     http://localhost:5173
echo.
echo Press any key to close this window (services will keep running)...
pause >nul
