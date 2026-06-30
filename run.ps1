# Skrypt uruchamiający całą aplikację CyclingForge
# Uruchamia backend (API), serwis Garmin (Python) oraz frontend

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$garminDir = "$projectRoot\services\garmin-python"
$venvUvicorn = "$garminDir\.venv\Scripts\uvicorn.exe"

Write-Host "=== CyclingForge - Uruchamianie aplikacji ===" -ForegroundColor Cyan

# Uruchom backend (API) w nowym oknie
Write-Host "Uruchamiam backend (API)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\src\Bootstrapper\CyclingForge.Bootstrapper'; dotnet run"

# Uruchom serwis Garmin (Python) w nowym oknie
Write-Host "Uruchamiam serwis Garmin (Python)..." -ForegroundColor Green
# Odtworz venv przy braku LUB gdy requirements.txt jest nowszy niz znacznik instalacji
# (inaczej nowo dodane zaleznosci nie zostana doinstalowane i serwis wywali ImportError).
$reqFile = "$garminDir\requirements.txt"
$installStamp = "$garminDir\.venv\.requirements.installed"
$needsInstall = (-not (Test-Path $venvUvicorn)) -or `
    (-not (Test-Path $installStamp)) -or `
    ((Get-Item $reqFile).LastWriteTimeUtc -gt (Get-Item $installStamp).LastWriteTimeUtc)

if ($needsInstall) {
    Write-Host "  [!] Instaluje/aktualizuje zaleznosci garmina..." -ForegroundColor Yellow
    $garminCmd = "cd '$garminDir'; if (-not (Test-Path .venv\Scripts\uvicorn.exe)) { py -3.12 -m venv .venv }; .venv\Scripts\pip.exe install -r requirements.txt; Set-Content -Path '$installStamp' -Value (Get-Date -Format o); .venv\Scripts\uvicorn.exe app.main:app --reload --port 8000"
} else {
    $garminCmd = "cd '$garminDir'; .venv\Scripts\uvicorn.exe app.main:app --reload --port 8000"
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", $garminCmd

# Poczekaj chwilę, żeby backend się zainicjalizował
Start-Sleep -Seconds 3

# Uruchom frontend w nowym oknie
Write-Host "Uruchamiam frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "Aplikacja uruchomiona!" -ForegroundColor Cyan
Write-Host "- Backend (API):      https://localhost:5043" -ForegroundColor Gray
Write-Host "- Garmin (Python):    http://localhost:8000  (docs: http://localhost:8000/docs)" -ForegroundColor Gray
Write-Host "- Frontend:           http://localhost:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "Zamknij okna terminala, aby zatrzymac serwery." -ForegroundColor Yellow
