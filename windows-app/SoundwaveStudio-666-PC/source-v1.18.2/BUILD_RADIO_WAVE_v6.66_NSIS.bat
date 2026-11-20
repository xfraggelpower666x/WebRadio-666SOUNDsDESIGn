@echo off
setlocal
cd /d "%~dp0"
title RADIO WAVE v6.66 - NSIS BUILD
echo ============================================================
echo  RADIO WAVE v6.66 - WINDOWS NSIS INSTALLER BUILD
echo ============================================================
where node >nul 2>nul || (echo FAIL: Node.js missing & pause & exit /b 1)
where npm >nul 2>nul || (echo FAIL: npm missing & pause & exit /b 1)
if not exist node_modules\electron\dist\electron.exe (
  echo [1/4] Installing locked dependencies...
  call npm ci || (echo npm ci failed. & pause & exit /b 1)
) else (
  echo [1/4] Dependencies present.
)
echo [2/4] Preparing RADIO WAVE branding and Windows icon...
call npm run prepare:branding || (echo BRANDING PREP FAILED & pause & exit /b 1)
echo [3/4] Running targeted RADIO WAVE release gates...
call npm run check:radio-wave-release || (echo RELEASE GATES FAILED & pause & exit /b 1)
echo [4/4] Building NSIS installer...
call npx electron-builder --win --x64 --publish never
if errorlevel 1 (echo NSIS BUILD FAILED & pause & exit /b 1)
echo.
echo BUILD PASS
echo Installer: dist\RADIO-WAVE-v6.66-Setup.exe
echo.
pause
