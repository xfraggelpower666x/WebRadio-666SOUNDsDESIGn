@echo off
setlocal
cd /d "%~dp0"

call bootstrap_windows.bat
if errorlevel 1 (
    echo.
    echo [FAILED] Environment setup failed.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  BUILDING LIGHT ORCHESTRA EXECUTABLES
echo ============================================================

if exist build rmdir /S /Q build
if not exist dist mkdir dist

".venv\Scripts\python.exe" -m PyInstaller --noconfirm --clean --onefile --name "666_LIGHT_ORCHESTRA" --hidden-import=device_registry --hidden-import=light_control_state 666_light_orchestra.py
if errorlevel 1 goto :build_fail

".venv\Scripts\python.exe" -m PyInstaller --noconfirm --clean --onefile --windowed --name "666_LIGHT_ORCHESTRA_SYMPHONY" --hidden-import=666_light_orchestra --hidden-import=device_registry --hidden-import=light_control_state 666_light_orchestra_control_center.py
if errorlevel 1 goto :build_fail

".venv\Scripts\python.exe" -m PyInstaller --noconfirm --clean --onefile --windowed --name "666_LIGHT_ORCHESTRA_LAB" --hidden-import=666_light_orchestra --hidden-import=device_registry 666_light_orchestra_gui.py
if errorlevel 1 goto :build_fail

echo.
echo [PASS] EXE build complete:
echo   dist\666_LIGHT_ORCHESTRA.exe
echo   dist\666_LIGHT_ORCHESTRA_SYMPHONY.exe
echo   dist\666_LIGHT_ORCHESTRA_LAB.exe
exit /b 0

:build_fail
echo.
echo [FAILED] EXE build failed.
pause
exit /b 2
