@echo off
setlocal
cd /d "%~dp0"
title RADIO WAVE v6.66 - SYSTEM CHECK
echo ============================================================
echo  RADIO WAVE v6.66 - TARGETED SYSTEM CHECK
echo  Historic Soundwave baseline is NOT rerun.
echo ============================================================
where node >nul 2>nul || (echo FAIL: Node.js missing & exit /b 1)
where npm >nul 2>nul || (echo FAIL: npm missing & exit /b 1)
node --version
npm --version
call npm run prepare:branding || exit /b 1
call npm run check:radio-wave-release || exit /b 1
echo PASS: RADIO WAVE targeted system gates
