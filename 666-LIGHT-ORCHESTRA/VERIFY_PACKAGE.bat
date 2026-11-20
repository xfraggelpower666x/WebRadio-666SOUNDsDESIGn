@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0VERIFY_PACKAGE.ps1"
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" (
    echo [PASS] Package verification complete.
) else (
    echo [FAILED] Package verification returned code %RC%.
)
pause
exit /b %RC%
