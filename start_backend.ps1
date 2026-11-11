# RideInsight AI 2.0 - Backend Startup
$root = $PSScriptRoot
cd $root

# Ensure port 8000 is free by terminating any orphaned processes
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port8000) {
    Write-Host "Freeing port 8000 from previous session..." -ForegroundColor Yellow
    $pids = $port8000 | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $pids) {
        if ($p -gt 0) {
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Milliseconds 500
}

.\backend\venv\Scripts\Activate.ps1
python run_backend.py
