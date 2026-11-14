@echo off
setlocal
cd /d "%~dp0"
where npm >nul 2>nul || (echo Node.js/npm is required. & pause & exit /b 1)
node scripts\ensure-electron.cjs --node-only || (pause & exit /b 1)
if not exist node_modules\.bin\electron.cmd (
  echo Installing project dependencies...
  call npm ci --include=dev || (echo npm ci failed. & pause & exit /b 1)
)
node scripts\ensure-electron.cjs || (pause & exit /b 1)
call npm start
if errorlevel 1 pause
