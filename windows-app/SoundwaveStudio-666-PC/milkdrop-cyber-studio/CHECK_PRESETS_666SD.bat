@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if "%~1"=="" (
  echo Usage: CHECK_PRESETS_666SD.bat "C:\path\to\MilkDrop3\presets"
  exit /b 2
)
if not exist "%~1" (
  echo ERROR: Preset source does not exist: %~1
  exit /b 2
)
if not exist "reports" mkdir "reports"
set "REPORT=%CD%\reports\666sd_preset_inventory.json"
echo [666SD] Read-only library audit: %~1
where py >nul 2>&1
if not errorlevel 1 (
  py -3 "code\tools\666sd_preset_audit.py" "%~1" --report "%REPORT%"
) else (
  python "code\tools\666sd_preset_audit.py" "%~1" --report "%REPORT%"
)
if errorlevel 1 (
  echo [666SD] FAIL: Preset inventory could not be completed.
  exit /b 1
)
echo [666SD] Report: %REPORT%
echo [666SD] Original library unchanged.
exit /b 0
