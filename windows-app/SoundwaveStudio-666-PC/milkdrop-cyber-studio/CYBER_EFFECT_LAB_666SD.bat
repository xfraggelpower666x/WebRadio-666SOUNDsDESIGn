@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "PYEXE=python"
where py >nul 2>&1
if not errorlevel 1 set "PYEXE=py -3"
:menu
cls
echo =====================================================
echo   666SOUNDsDESIGn - CYBER EFFECT LAB R13
echo   Original EEL effects / never overwrite originals
echo =====================================================
echo   1. Neon Vortex / 146 BPM
echo   2. Cyan Tunnel / 145 BPM
echo   3. Violet Interference / 148 BPM
echo   4. Amber Pulse / 150 BPM
echo   5. Inspect my preset library (read only)
echo   0. Exit
echo =====================================================
set "MODE="
set /p "MODE=Select: "
if "%MODE%"=="0" exit /b 0
if "%MODE%"=="5" goto audit
if "%MODE%"=="1" (set "FX=vortex" & set "PAL=neon" & set "BPM=146")
if "%MODE%"=="2" (set "FX=tunnel" & set "PAL=cyan" & set "BPM=145")
if "%MODE%"=="3" (set "FX=interference" & set "PAL=violet" & set "BPM=148")
if "%MODE%"=="4" (set "FX=pulse" & set "PAL=amber" & set "BPM=150")
if not defined FX goto invalid
if not exist "reports" mkdir "reports"
set "DEST=reports\666SD_%FX%_%PAL%_%RANDOM%_%RANDOM%.milk"
echo Creating %DEST%
%PYEXE% "code\tools\666sd_effect_lab.py" --effect "%FX%" --palette "%PAL%" --bpm "%BPM%" --output "%DEST%"
if errorlevel 1 echo ERROR: No preset created. Check Python and permissions.
set "FX="
set "PAL="
set "BPM="
pause
goto menu
:audit
set "FOLDER="
set /p "FOLDER=Full path to your presets folder: "
if not defined FOLDER goto menu
call "CHECK_PRESETS_666SD.bat" "%FOLDER%"
pause
goto menu
:invalid
echo Invalid selection. No changes made.
pause
goto menu
