@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\netfx3.ps1" -Action enable
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%
