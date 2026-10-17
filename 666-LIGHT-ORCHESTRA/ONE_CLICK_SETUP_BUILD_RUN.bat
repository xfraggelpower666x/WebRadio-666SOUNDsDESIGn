@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo  666 LIGHT ORCHESTRA - ONE CLICK SETUP / BUILD / RUN
echo ============================================================
echo.

call BUILD_EXE.bat
if errorlevel 1 exit /b 1

echo.
echo [START] Launching built SYMPHONY EXE...
start "" "dist\666_LIGHT_ORCHESTRA_SYMPHONY.exe"
if errorlevel 1 (
    echo [ERROR] Could not launch built EXE.
    pause
    exit /b 2
)

echo [PASS] Setup, update, build and launch completed.
timeout /t 2 >nul
exit /b 0
