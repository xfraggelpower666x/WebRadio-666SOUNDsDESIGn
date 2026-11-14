@echo off
setlocal
cd /d "%~dp0"
call CHECK_SYSTEM.bat || (pause & exit /b 1)
echo [1/3] Installing dependencies when required...
if not exist node_modules\.bin\electron.cmd call npm ci --include=dev || (echo npm ci failed. & pause & exit /b 1)
node scripts\ensure-electron.cjs || (pause & exit /b 1)
echo [2/3] Running release-integrity gates...
call npm run check:release || (echo RELEASE INTEGRITY FAILED - build blocked. & pause & exit /b 1)
echo [3/3] Building portable Windows package + ZIP...
call node scripts\build.js
if errorlevel 1 (echo BUILD FAILED & pause & exit /b 1)
echo BUILD PASS - see dist\
pause
