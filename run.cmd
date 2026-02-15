@echo off
REM Skrypt uruchamiający całą aplikację CyclingForge
REM Uruchamia backend (API) oraz frontend

echo === CyclingForge - Uruchamianie aplikacji ===
echo.

echo Uruchamiam backend (API)...
start "CyclingForge API" cmd /k "cd /d %~dp0src\Bootstrapper\CyclingForge.Bootstrapper && dotnet run"

timeout /t 3 /nobreak > nul

echo Uruchamiam frontend...
start "CyclingForge Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Aplikacja uruchomiona!
echo - Backend (API): https://localhost:5043
echo - Frontend: sprawdz port w oknie terminala (zazwyczaj http://localhost:5173)
echo.
echo Zamknij okna terminala, aby zatrzymac serwery.
pause
