@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "APP=%~f1"
pushd "%~dp0..\.." || exit /b 1
if defined APP goto verify
set "APP=%CD%\RADIO WAVE v6.66.exe"
if exist "%APP%" goto verify
set "APP=%CD%\dist\win-unpacked\RADIO WAVE v6.66.exe"
:verify
if /i not "%~x1"==".exe" if not "%~1"=="" goto missing
if not exist "%APP%" goto missing
for %%I in ("%APP%") do set "APPDIR=%%~dpI"
if not exist "%APPDIR%resources\app.asar" if not exist "%APPDIR%resources\app\package.json" goto missing
set "LOG=%TEMP%\RADIO-WAVE-v6.66-startup.log"
set "BEFORE="
if exist "%LOG%" for %%I in ("%LOG%") do set "BEFORE=%%~zI"
echo Starting "%APP%"
start "" /wait /d "%APPDIR%." "%APP%"
set "RC=%errorlevel%"
echo Process exit code: %RC%
echo Startup log: "%LOG%"
if exist "%LOG%" for %%I in ("%LOG%") do if "%%~zI"=="%BEFORE%" echo No log growth detected during this launch.
if exist "%LOG%" type "%LOG%"
if not exist "%LOG%" echo No startup log was created.
goto done
:missing
echo ERROR: Specify the executable from the unpacked RADIO WAVE diagnostic folder.
echo Example: %~nx0 "C:\RADIO WAVE\RADIO WAVE v6.66.exe"
set "RC=2"
:done
popd
if /i not "%~2"=="/nopause" pause
exit /b %RC%
