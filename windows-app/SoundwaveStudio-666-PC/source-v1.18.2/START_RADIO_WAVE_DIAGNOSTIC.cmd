@echo off
setlocal
title RADIO WAVE v6.66 - DIAGNOSTIC START
cd /d "%~dp0"

echo ============================================================
echo  RADIO WAVE v6.66 - DIAGNOSTIC START
echo ============================================================
echo Working directory: %CD%
echo.

set "APP=%CD%\RADIO WAVE v6.66.exe"
if not exist "%APP%" (
  echo FAIL: App executable not found:
  echo %APP%
  echo.
  dir /b *.exe
  pause
  exit /b 2
)

set "LOG=%TEMP%\RADIO-WAVE-v6.66-startup.log"
if exist "%LOG%" del /q "%LOG%" >nul 2>nul

echo Starting:
echo "%APP%"
echo.
start "" /wait "%APP%"
set "RC=%ERRORLEVEL%"

echo.
echo ============================================================
echo Process exit code: %RC%
echo Startup log: %LOG%
echo ============================================================
if exist "%LOG%" (
  type "%LOG%"
) else (
  echo No startup log was created.
  echo This means the process likely failed before main.js executed
  echo or Windows blocked execution before Electron reached app code.
)
echo.
echo Press any key to close this diagnostic window.
pause >nul
exit /b %RC%
