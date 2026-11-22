@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\directx_sdk.ps1" -Action check
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%
