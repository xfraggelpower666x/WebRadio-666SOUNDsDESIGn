@echo off
setlocal
cd /d "%~dp0"
where npm >nul 2>nul || (echo Node.js/npm is required. & pause & exit /b 1)
if not exist node_modules\electron\dist\electron.exe (
  echo Installing project dependencies...
  call npm install || (echo npm install failed. & pause & exit /b 1)
)
call npm start
if errorlevel 1 pause
