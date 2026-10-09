@echo off
setlocal
cd /d "%~dp0"

call bootstrap_windows.bat
if errorlevel 1 (
    echo.
    echo [FAILED] Environment setup failed.
    pause
    exit /b 1
)

echo.
echo [START] LIGHT ORCHESTRA SYMPHONY Control Center
".venv\Scripts\python.exe" 666_light_orchestra_control_center.py
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
    echo.
    echo [ERROR] Control Center exited with code %RC%.
    pause
)
exit /b %RC%
