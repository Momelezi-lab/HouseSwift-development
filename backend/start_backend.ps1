# PowerShell script to start the backend
Write-Host "Starting HomeSwift Backend Server..." -ForegroundColor Green
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Try python first, then py
try {
    python app.py
} catch {
    Write-Host "Python command failed, trying 'py'..." -ForegroundColor Yellow
    py app.py
}

