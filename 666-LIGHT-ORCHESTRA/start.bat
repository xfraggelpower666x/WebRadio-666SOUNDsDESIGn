@echo off
setlocal
cd /d "%~dp0"

set "SYMPHONY_EXE=dist\666_LIGHT_ORCHESTRA_SYMPHONY.exe"
set "SYMPHONY_SOURCE=666_light_orchestra_control_center.py"

if exist "%SYMPHONY_EXE%" (
    echo ============================================================
    echo  666 LIGHT ORCHESTRA SYMPHONY
    echo ============================================================
    echo.
    echo [START] Launching validated Windows EXE...
    start "" "%SYMPHONY_EXE%"
    if errorlevel 1 (
        echo [ERROR] Could not launch %SYMPHONY_EXE%.
        pause
        exit /b 2
    )
    echo [PASS] SYMPHONY EXE launched.
    exit /b 0
)

if not exist "%SYMPHONY_SOURCE%" (
    echo ============================================================
    echo  666 LIGHT ORCHESTRA SYMPHONY - PACKAGE ERROR
    echo ============================================================
    echo.
    echo [ERROR] Neither the built EXE nor the Python source is present.
    echo [MISSING] %SYMPHONY_EXE%
    echo [MISSING] %SYMPHONY_SOURCE%
    echo.
    echo Please use a complete LIGHT ORCHESTRA Windows package.
    pause
    exit /b 3
)

call bootstrap_windows.bat
if errorlevel 1 (
    echo.
    echo [FAILED] Environment setup failed.
    pause
    exit /b 1
)

echo.
echo [START] LIGHT ORCHESTRA SYMPHONY Control Center from Python source
".venv\Scripts\python.exe" "%SYMPHONY_SOURCE%"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
    echo.
    echo [ERROR] Control Center exited with code %RC%.
    pause
)
exit /b %RC%
