@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\bootstrap.ps1" -Action build
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo BUILD FEHLGESCHLAGEN: Status %RC%. Siehe logs\LATEST.log
  pause
)
exit /b %RC%
