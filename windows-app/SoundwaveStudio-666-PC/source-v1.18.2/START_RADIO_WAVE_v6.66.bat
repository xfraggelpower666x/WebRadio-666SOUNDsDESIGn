@echo off
setlocal
cd /d "%~dp0"
title RADIO WAVE v6.66
echo ============================================================
echo  RADIO WAVE v6.66 - START
echo  Soundwave Core + 666 WebRadio Addon
echo ============================================================
where node >nul 2>nul || (echo FAIL: Node.js missing & pause & exit /b 1)
where npm >nul 2>nul || (echo FAIL: npm missing & pause & exit /b 1)
node scripts\ensure-electron.cjs --node-only || (pause & exit /b 1)
if not exist node_modules\.bin\electron.cmd (
  echo Installing project dependencies...
  call npm ci --include=dev || (echo npm ci failed. & pause & exit /b 1)
)
node scripts\ensure-electron.cjs || (pause & exit /b 1)
call npm run prepare:branding || (echo Branding preparation failed. & pause & exit /b 1)
call npm run check:radio-wave-release || (echo RADIO WAVE targeted gate failed. & pause & exit /b 1)
call npm start
if errorlevel 1 pause
