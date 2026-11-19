@echo off
setlocal
title RADIO WAVE - ASUS Aura Test
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js 22.12 or newer is required. Use the existing RADIO_WAVE.bat setup.
  pause
  exit /b 1
)
node.exe -e "const [major, minor] = process.versions.node.split('.').map(Number); if (major < 22 || (major === 22 && minor < 12)) process.exitCode = 1"
if errorlevel 1 (
  echo Node.js 22.12 or newer is required. Use the existing RADIO_WAVE.bat setup.
  pause
  exit /b 1
)
node.exe "%~dp0aura-test.cjs" %*
set "RESULT=%ERRORLEVEL%"
echo.
echo ASUS Aura test exit code: %RESULT%
pause
exit /b %RESULT%
