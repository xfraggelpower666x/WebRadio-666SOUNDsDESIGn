@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0..\.." || exit /b 1
where py.exe >nul 2>nul && py -3 --version >nul 2>nul && goto launcher
where python.exe >nul 2>nul && python --version >nul 2>nul && goto python
echo ERROR: Python 3 is missing.
set "RC=2"
goto done
:launcher
py -3 "soundwave_666.py"
goto capture
:python
python "soundwave_666.py"
:capture
set "RC=%errorlevel%"
:done
popd
if not "%RC%"=="0" if /i not "%~1"=="/nopause" pause
exit /b %RC%
