# Skrypt uruchamiający całą aplikację CyclingForge
# Uruchamia backend (API) oraz frontend

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot

Write-Host "=== CyclingForge - Uruchamianie aplikacji ===" -ForegroundColor Cyan

# Uruchom backend (API) w nowym oknie
Write-Host "Uruchamiam backend (API)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\src\Bootstrapper\CyclingForge.Bootstrapper'; dotnet run"

# Poczekaj chwilę, żeby backend się zainicjalizował
Start-Sleep -Seconds 3

# Uruchom frontend w nowym oknie
Write-Host "Uruchamiam frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "Aplikacja uruchomiona!" -ForegroundColor Cyan
Write-Host "- Backend (API): https://localhost:5043" -ForegroundColor Gray
Write-Host "- Frontend: sprawdz port w oknie terminala (zazwyczaj http://localhost:5173)" -ForegroundColor Gray
Write-Host ""
Write-Host "Zamknij okna terminala, aby zatrzymac serwery." -ForegroundColor Yellow
