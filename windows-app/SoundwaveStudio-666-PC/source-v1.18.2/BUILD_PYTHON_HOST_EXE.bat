@echo off
setlocal
cd /d "%~dp0"
where pyinstaller >nul 2>nul
if errorlevel 1 (
  echo PYINSTALLER_NOT_FOUND
  echo Install it explicitly with: py -3 -m pip install pyinstaller
  echo Then run this file again. No package is installed automatically.
  pause
  exit /b 2
)
pyinstaller --noconfirm --clean --onefile --windowed --name "SoundwaveStudio666-PythonHost" soundwave_666.py
if errorlevel 1 (echo PYTHON HOST EXE BUILD FAILED & pause & exit /b 1)
echo PYTHON HOST EXE BUILD PASS - see dist\SoundwaveStudio666-PythonHost.exe
pause
