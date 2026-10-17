@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "PY_CMD="
set "PY_MIN_MAJOR=3"
set "PY_MIN_MINOR=11"
set "PY_INSTALL_ID=Python.Python.3.12"

echo ============================================================
echo  666 LIGHT ORCHESTRA - WINDOWS BOOTSTRAP
echo ============================================================
echo.

call :find_python
if defined PY_CMD goto :python_found

echo [INFO] Python 3.11+ not found.
where winget >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python is missing and Windows Package Manager ^(winget^) is not available.
    echo [ACTION] Install Python 3.12 or newer from python.org, then run this batch again.
    exit /b 10
)

echo [INFO] Installing Python 3.12 with winget...
winget install --id %PY_INSTALL_ID% --exact --silent --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
    echo [ERROR] Automatic Python installation failed.
    exit /b 11
)

call :find_python
if not defined PY_CMD (
    echo [ERROR] Python was installed but could not be found in this shell.
    echo [ACTION] Close this window and run the batch again.
    exit /b 12
)

:python_found
echo [OK] Python command: %PY_CMD%
%PY_CMD% --version

where winget >nul 2>nul
if not errorlevel 1 (
    echo [INFO] Checking for available Python update via winget...
    winget upgrade --id %PY_INSTALL_ID% --exact --silent --accept-package-agreements --accept-source-agreements >nul 2>nul
)

echo [INFO] Ensuring pip is available...
%PY_CMD% -m ensurepip --upgrade >nul 2>nul
if errorlevel 1 (
    echo [WARN] ensurepip returned an error; checking existing pip...
)
%PY_CMD% -m pip --version >nul 2>nul
if errorlevel 1 (
    echo [ERROR] pip is unavailable.
    exit /b 20
)

if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Creating isolated virtual environment...
    %PY_CMD% -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Could not create .venv.
        exit /b 21
    )
) else (
    echo [OK] Existing .venv found.
)

set "VENV_PY=%CD%\.venv\Scripts\python.exe"
if not exist "%VENV_PY%" (
    echo [ERROR] Virtual environment Python missing.
    exit /b 22
)

echo [INFO] Updating pip / setuptools / wheel...
"%VENV_PY%" -m pip install --upgrade pip setuptools wheel
if errorlevel 1 exit /b 23

echo [INFO] Installing/updating project requirements...
"%VENV_PY%" -m pip install --upgrade -r requirements.txt
if errorlevel 1 exit /b 24

echo [INFO] Verifying required Python modules...
"%VENV_PY%" -c "import tkinter, bleak, PyInstaller; print('MODULE CHECK PASS')"
if errorlevel 1 (
    echo [ERROR] One or more required Python modules are unavailable.
    exit /b 25
)

if not exist "config.json" (
    echo [INFO] Creating config.json from config.example.json...
    copy /Y "config.example.json" "config.json" >nul
    if errorlevel 1 exit /b 26
)

echo.
echo [PASS] Windows bootstrap complete.
echo [PASS] Python / pip / venv / requirements are ready.
exit /b 0

:find_python
set "PY_CMD="
for %%P in ("py -3.13" "py -3.12" "py -3.11" "python") do (
    cmd /c %%~P -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" >nul 2>nul
    if not errorlevel 1 (
        set "PY_CMD=%%~P"
        goto :eof
    )
)
goto :eof
