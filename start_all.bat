@echo off
echo ===================================================
echo Starting AI Voice Agent to Bitrix24 Full Stack
echo ===================================================

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "Voice Agent Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting React Vite Frontend on http://localhost:5173 ...
start "Voice Agent Frontend" cmd /k "cd frontend && npm run dev"

echo ===================================================
echo Backend API Docs: http://localhost:8000/docs
echo Frontend Console: http://localhost:5173
echo ===================================================
pause
