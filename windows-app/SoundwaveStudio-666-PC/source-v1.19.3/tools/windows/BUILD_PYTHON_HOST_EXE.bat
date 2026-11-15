@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0..\.." || exit /b 1
where py.exe >nul 2>nul && py -3 --version >nul 2>nul && goto launcher
where python.exe >nul 2>nul && python --version >nul 2>nul && goto python
echo ERROR: Python 3 is missing.
set "RC=2"
goto done
:launcher
set "PY=py -3"
goto build
:python
set "PY=python"
:build
%PY% -m PyInstaller --version >nul 2>nul
if errorlevel 1 goto missing
%PY% -m PyInstaller --noconfirm --clean --onefile --windowed --name "SoundwaveStudio666-PythonHost" "soundwave_666.py"
set "RC=%errorlevel%"
if not "%RC%"=="0" goto done
if not exist "dist\SoundwaveStudio666-PythonHost.exe" (set "RC=1" & goto done)
echo PASS: dist\SoundwaveStudio666-PythonHost.exe
goto done
:missing
echo PYINSTALLER_NOT_FOUND
echo To install it explicitly: %PY% -m pip install pyinstaller
echo No package is installed automatically.
set "RC=2"
:done
popd
if /i not "%~1"=="/nopause" pause
exit /b %RC%
