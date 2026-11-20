@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0EXPORT_EVIDENCE.ps1"
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" (
    echo [PASS] Evidence export complete.
) else (
    echo [FAILED] Evidence export returned code %RC%.
)
pause
exit /b %RC%
