@echo off
setlocal
cd /d "%~dp0"

call bootstrap_windows.bat
if errorlevel 1 (
    echo [FAILED] Environment setup failed.
    pause
    exit /b 1
)

echo.
echo [START] READ-ONLY LIGHT ORCHESTRA DIAGNOSTICS
".venv\Scripts\python.exe" 666_light_orchestra_diagnostics.py
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" (
    echo [PASS] Diagnostic report created in diagnostics\LIGHT_ORCHESTRA_DIAGNOSTICS.json
) else (
    echo [FAILED] Diagnostics exited with code %RC%.
)
pause
exit /b %RC%
