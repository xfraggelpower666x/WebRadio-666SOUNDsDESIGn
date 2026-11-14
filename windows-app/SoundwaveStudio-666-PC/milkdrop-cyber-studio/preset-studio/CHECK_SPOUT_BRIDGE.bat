@echo off
setlocal
cd /d "%~dp0"
if not exist "logs" mkdir "logs"
set "PYEXE=.venv\Scripts\python.exe"
if not exist "%PYEXE%" set "PYEXE=py"
set "SPOUT=%~1"
set "SYPHON=%~2"
if "%SPOUT%"=="" set "SPOUT=%~dp0Spout2-master.zip"
if "%SYPHON%"=="" set "SYPHON=%~dp0Java-master.zip"
"%PYEXE%" "src\spout_bridge.py" --spout "%SPOUT%" --syphon "%SYPHON%" --output "logs\LATEST_SPOUT.json" > "logs\LATEST_SPOUT.log" 2>&1
set "RESULT=%ERRORLEVEL%"
type "logs\LATEST_SPOUT.log"
if not "%RESULT%"=="0" echo Missing archive or check failed. Use: CHECK_SPOUT_BRIDGE.bat "C:\path\Spout2-master.zip" "C:\path\Java-master.zip"
exit /b %RESULT%
