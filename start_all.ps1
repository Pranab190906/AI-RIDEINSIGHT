# RideInsight AI 2.0 - One-Click Full Stack Launcher
$root = $PSScriptRoot

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "       RIDEINSIGHT AI 2.0 - FULL STACK LAUNCHER       " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Launching FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; .\backend\venv\Scripts\Activate.ps1; python run_backend.py"

Write-Host "Waiting 3 seconds for backend initialization..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host "[2/2] Launching React Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "`n[SUCCESS] Both servers launched in separate terminal windows!" -ForegroundColor Green
Write-Host "-> Backend API: http://127.0.0.1:8000 (Docs at http://127.0.0.1:8000/docs)" -ForegroundColor White
Write-Host "-> Frontend Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host "`nOpen http://localhost:5173 in your browser to explore RideInsight AI 2.0.`n" -ForegroundColor Cyan
