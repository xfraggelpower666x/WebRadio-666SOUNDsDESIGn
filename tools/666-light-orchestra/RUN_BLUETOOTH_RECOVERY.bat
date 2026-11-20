@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo  666 LIGHT ORCHESTRA - BLUETOOTH RECOVERY
echo ============================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0BLUETOOTH_RECOVERY.ps1"
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
    echo [DONE] Recovery attempt completed.
) else (
    echo [WARN] Recovery attempt returned code %RC%.
)
echo.
echo Next: run RUN_DIAGNOSTICS.bat or open SYMPHONY and press BLUETOOTH CHECK.
pause
exit /b %RC%
