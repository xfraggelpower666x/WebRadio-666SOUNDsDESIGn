@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22 oder neuer wird benoetigt.
  pause
  exit /b 1
)
node server.cjs
if errorlevel 1 pause
