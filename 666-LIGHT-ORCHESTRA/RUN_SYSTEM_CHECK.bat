@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_SYSTEM_CHECK.ps1"
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" (
    echo [PASS] System check completed.
) else (
    echo [WARN] System check completed with code %RC%.
)
pause
exit /b %RC%
