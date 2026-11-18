@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "LWT_ROOT=%~dp0"
set "LWT_START=%LWT_ROOT%light_wave_start.py"
set "LWT_LOCK=%LWT_ROOT%requirements-windows-py312.txt"
set "LWT_ENV=%LWT_ROOT%.venv"
set "LWT_PY=%LWT_ENV%\Scripts\python.exe"
set "LWT_LOG_DIR=%LOCALAPPDATA%\LightWaveTech"
set "LWT_INTERACTIVE="
set "PYTHONUTF8=1"
if "%~1"=="" set "LWT_INTERACTIVE=1"
if /I "%~1"=="menu" set "LWT_INTERACTIVE=1"
if not defined LOCALAPPDATA set "LWT_LOG_DIR=%TEMP%\LightWaveTech"
if not exist "%LWT_LOG_DIR%\." mkdir "%LWT_LOG_DIR%" >nul 2>&1
if not exist "%LWT_LOG_DIR%\." set "LWT_LOG_DIR=%TEMP%"
set "LWT_LOG=%LWT_LOG_DIR%\player-start.log"
if exist "%LWT_START%" if exist "%LWT_LOCK%" if defined LWT_INTERACTIVE goto menu
call :start_log
if not exist "%LWT_START%" goto incomplete
if not exist "%LWT_LOCK%" goto incomplete
if /I "%~1"=="studio" goto menu_studio
if /I "%~1"=="install" goto install
if /I "%~1"=="test" goto tests
if /I "%~1"=="portable" goto build_portable
if /I "%~1"=="setup" goto build_setup
if /I "%~1"=="diagnose" goto diagnose
if /I "%~1"=="cache" goto cache
if /I "%~1"=="vr" goto vr
if /I "%~1"=="radio" goto menu_radio
if /I "%~1"=="player" goto menu_player
if /I "%~1"=="--help" goto help
if /I "%~1"=="--demo" if /I "%~2"=="--check" goto preflight
if /I "%~1"=="effects" goto effects
if /I "%~1"=="test-media" goto menu_test

call :ensure_runtime
if errorlevel 1 goto fail
"%LWT_PY%" -u -B "%LWT_START%" %* >> "%LWT_LOG%" 2>&1
goto finish

:menu
set "LWT_ACTION="
cls
echo.
echo  666AUDIO LIGHT WAVE - Windows developer tools
echo.
echo    R  Run Studio from source
echo    T  Run project tests
echo    D  Diagnose runtime and media
echo    P  Build portable Windows EXE
echo    S  Build Windows Setup
echo    I  Install or repair project dependencies
echo    Q  Quit
echo.
choice /C RTDPSIQ /N /M "Select an action: "
set "LWT_SELECTION=%ERRORLEVEL%"
if "%LWT_SELECTION%"=="1" set "LWT_ACTION=menu_studio"
if "%LWT_SELECTION%"=="2" set "LWT_ACTION=tests"
if "%LWT_SELECTION%"=="3" set "LWT_ACTION=diagnose"
if "%LWT_SELECTION%"=="4" set "LWT_ACTION=build_portable"
if "%LWT_SELECTION%"=="5" set "LWT_ACTION=build_setup"
if "%LWT_SELECTION%"=="6" set "LWT_ACTION=install"
if not defined LWT_ACTION exit /b 0
call :start_log
>> "%LWT_LOG%" echo Action: %LWT_ACTION%
goto %LWT_ACTION%

:menu_studio
call :ensure_runtime
if errorlevel 1 goto fail
call :ensure_radio
if errorlevel 1 goto fail
call :ensure_vr
if errorlevel 1 goto fail
echo Opening 666AUDIO LIGHT WAVE Studio.
"%LWT_PY%" -u -B "%LWT_ROOT%light_wave_desktop.py" >> "%LWT_LOG%" 2>&1
goto finish

:tests
call :ensure_runtime
if errorlevel 1 goto fail
call :ensure_radio
if errorlevel 1 goto fail
call :ensure_vr
if errorlevel 1 goto fail
"%LWT_PY%" -B -m unittest discover -s "%LWT_ROOT%tests" >> "%LWT_LOG%" 2>&1
if errorlevel 1 goto fail
"%LWT_PY%" -B "%LWT_ROOT%light_wave_desktop.py" --smoke-test >> "%LWT_LOG%" 2>&1
if errorlevel 1 goto fail
type "%LWT_LOG%"
goto success

:build_setup
call :find_iscc
if errorlevel 1 goto fail
call :compile_app
if errorlevel 1 goto fail
"%LWT_ISCC%" "%LWT_ROOT%packaging\LightWaveTech.iss" >> "%LWT_LOG%" 2>&1
if errorlevel 1 goto fail
if not exist "%LWT_ROOT%dist\666AUDIO-LIGHT-WAVE-Setup-x64.exe" goto fail
echo Setup: "%LWT_ROOT%dist\666AUDIO-LIGHT-WAVE-Setup-x64.exe"
goto success

:build_portable
call :compile_app
if errorlevel 1 goto fail
goto success

:compile_app
call :ensure_runtime
if errorlevel 1 exit /b 2
call :ensure_radio
if errorlevel 1 exit /b 2
call :ensure_vr
if errorlevel 1 exit /b 2
"%LWT_PY%" -B -c "from importlib.metadata import version; import sys; sys.exit(version('pyinstaller') != '6.22.3')" >> "%LWT_LOG%" 2>&1
if not errorlevel 1 goto freeze_app
"%LWT_PY%" -m pip install --disable-pip-version-check --only-binary=:all: pyinstaller==6.22.3 >> "%LWT_LOG%" 2>&1
if errorlevel 1 exit /b 2

:freeze_app
echo Building 666AUDIO-LIGHT-WAVE.exe. Log: "%LWT_LOG%"
"%LWT_PY%" -m PyInstaller --noconfirm --workpath "%LWT_ROOT%build" --distpath "%LWT_ROOT%build\candidate" "%LWT_ROOT%packaging\LightWaveTech.spec" >> "%LWT_LOG%" 2>&1
if errorlevel 1 exit /b 2
start "" /wait "%LWT_ROOT%build\candidate\666AUDIO-LIGHT-WAVE.exe" --smoke-test
if errorlevel 1 (
    echo EXE smoke test failed. Check "%LWT_LOG_DIR%\desktop.log". >> "%LWT_LOG%"
    exit /b 2
)
if not exist "%LWT_ROOT%dist\." mkdir "%LWT_ROOT%dist" >> "%LWT_LOG%" 2>&1
copy /y "%LWT_ROOT%build\candidate\666AUDIO-LIGHT-WAVE.exe" "%LWT_ROOT%dist\666AUDIO-LIGHT-WAVE.exe" >> "%LWT_LOG%" 2>&1
if errorlevel 1 exit /b 2
echo Portable EXE: "%LWT_ROOT%dist\666AUDIO-LIGHT-WAVE.exe"
exit /b 0

:find_iscc
if defined LWT_ISCC if exist "%LWT_ISCC%" exit /b 0
set "LWT_ISCC="
for /f "delims=" %%I in ('where ISCC.exe 2^>nul') do if not defined LWT_ISCC set "LWT_ISCC=%%I"
if not defined LWT_ISCC if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set "LWT_ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not defined LWT_ISCC if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" set "LWT_ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
if not defined LWT_ISCC if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" set "LWT_ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
if defined LWT_ISCC exit /b 0
echo Inno Setup Compiler not found. Install Inno Setup 6 or set LWT_ISCC to ISCC.exe. >> "%LWT_LOG%"
exit /b 2

:menu_player
call :ensure_runtime
if errorlevel 1 goto fail
call :ensure_radio
if errorlevel 1 goto fail
echo Oeffne das Player-Fenster.
"%LWT_PY%" -u -B "%LWT_ROOT%light_wave_menu.py" player >> "%LWT_LOG%" 2>&1
goto finish

:menu_radio
call :ensure_runtime
if errorlevel 1 goto fail
call :ensure_radio
if errorlevel 1 goto fail
echo Verbinde mit 666SOUNDsDESIGn Live-Radio. Esc im Player kehrt zurueck.
"%LWT_PY%" -u -B "%LWT_ROOT%light_wave_menu.py" radio >> "%LWT_LOG%" 2>&1
goto finish

:menu_test
echo Technische Testdateien enthalten einen tiefen Sinuston und Farbmuster.
choice /C EBQ /N /M "[E] Effekt-Render-Test  [B] Audio-Testton  [Q] Zurueck: "
set "LWT_SELECTION=%ERRORLEVEL%"
if "%LWT_SELECTION%"=="1" goto effects
if "%LWT_SELECTION%"=="2" goto demo
goto menu

:demo
call :ensure_runtime
if errorlevel 1 goto fail
echo Starte Audio-Testton. Startprotokoll: "%LWT_LOG%"
"%LWT_PY%" -u -B "%LWT_START%" --demo --reduced-flash >> "%LWT_LOG%" 2>&1
goto finish

:effects
call :ensure_runtime
if errorlevel 1 goto fail
echo Starte den Effekt-Render-Test mit Testton und Farbmustern. Startprotokoll: "%LWT_LOG%"
"%LWT_PY%" -u -B "%LWT_START%" --demo --windowed >> "%LWT_LOG%" 2>&1
goto finish

:install
call :install_runtime
goto finish

:diagnose
call :find_python
if errorlevel 1 goto fail
call :run_base "%LWT_START%" --demo --check
if errorlevel 1 goto fail
if not exist "%LWT_PY%" (
    echo Python-Umgebung fehlt. Starte eine Demo oder waehle Installation im Menue. >> "%LWT_LOG%"
    goto fail
)
"%LWT_PY%" -u -B -c "import sys; print(sys.version); print('Pygame/OpenGL'); import pygame, moderngl; print('OpenCV'); import cv2; print('Audio-Codecs'); import soundfile; print('PortAudio-Geraete'); import sounddevice as sd; print(sd.query_hostapis()); print(sd.query_devices(kind='output')); print('Weitere Player-Module'); import numpy, scipy, pandas, mutagen, pyloudnorm, pyfar, loguru, matplotlib, sympy, PIL; print('Importpruefung OK')" >> "%LWT_LOG%" 2>&1
if errorlevel 1 goto fail
type "%LWT_LOG%"
goto success

:preflight
call :find_python
if errorlevel 1 goto fail
call :run_base "%LWT_START%" %*
if errorlevel 1 goto fail
type "%LWT_LOG%"
goto success

:cache
set "LWT_CACHE_MODE=%~2"

:cache_run
call :find_python
if errorlevel 1 goto fail
set "LWT_GENERATOR=config_preload_path_names.py"
if /I "%LWT_CACHE_MODE%"=="minimal" set "LWT_GENERATOR=minimal_config_preload_path_names.py"
if /I "%LWT_CACHE_MODE%"=="nsfw" set "LWT_GENERATOR=nsfw_config_preload_path_names.py"
if not "%LWT_CACHE_MODE%"=="" if /I not "%LWT_CACHE_MODE%"=="normal" if /I not "%LWT_CACHE_MODE%"=="minimal" if /I not "%LWT_CACHE_MODE%"=="nsfw" (
    echo Unbekannter Cache-Modus. Erlaubt: normal, minimal, nsfw. >> "%LWT_LOG%"
    goto fail
)
call :run_base "%LWT_ROOT%CONFIG\%LWT_GENERATOR%"
if errorlevel 1 goto fail
type "%LWT_LOG%"
goto success

:vr
call :ensure_vr
if errorlevel 1 goto fail
"%LWT_PY%" -u -B "%LWT_ROOT%2.5D_vr_main.py" "%~2" "%~3" >> "%LWT_LOG%" 2>&1
goto finish

:help
call :find_python
if errorlevel 1 goto fail
call :run_base "%LWT_START%" --help
if errorlevel 1 goto fail
type "%LWT_LOG%"
echo.
echo Batch-Befehle: studio, test, portable, setup, install, diagnose, cache, vr, radio, player, effects
exit /b 0

:incomplete
echo Projektdateien fehlen. ZIP vollstaendig entpacken und diese BAT neben light_wave_start.py legen. >> "%LWT_LOG%"
goto fail

:finish
set "LWT_RC=%ERRORLEVEL%"
if not "%LWT_RC%"=="0" goto launch_fail
if defined LWT_INTERACTIVE echo Protokoll: "%LWT_LOG%"

:success
if not defined LWT_INTERACTIVE exit /b 0
echo.
echo Modus abgeschlossen. Taste druecken, um zum Menue zurueckzukehren.
pause >nul
goto menu

:fail
set "LWT_RC=2"

:launch_fail
echo.
type "%LWT_LOG%"
echo.
echo 666AUDIO LIGHT WAVE konnte nicht starten oder die Pruefung ist fehlgeschlagen.
echo Startprotokoll: "%LWT_LOG%"
if not defined LWT_INTERACTIVE exit /b %LWT_RC%
if not defined LWT_ACTION (
    pause
    exit /b %LWT_RC%
)
copy /y "%LWT_LOG%" "%LWT_LOG_DIR%\player-last-error.log" >nul 2>&1
echo.
echo Taste druecken, um zum Menue zurueckzukehren.
pause >nul
goto menu

:start_log
> "%LWT_LOG%" echo 666AUDIO LIGHT WAVE R6 - Start %DATE% %TIME%
if errorlevel 1 set "LWT_LOG=%TEMP%\LightWaveTech-player-start.log"
>> "%LWT_LOG%" echo Projekt: "%LWT_ROOT%"
exit /b 0

:ensure_runtime
if not exist "%LWT_PY%" goto install_runtime
"%LWT_PY%" -B -c "import sys,sysconfig; sys.exit(not (sys.version_info[:2]==(3,12) and sysconfig.get_platform()=='win-amd64'))" >> "%LWT_LOG%" 2>&1
if errorlevel 1 (
    echo Die vorhandene .venv ist ungueltig oder verwendet kein Python 3.12 x64. >> "%LWT_LOG%"
    echo Benenne den Ordner .venv um und starte die BAT erneut. >> "%LWT_LOG%"
    exit /b 2
)
"%LWT_PY%" -B -c "from importlib.util import find_spec; import sys; sys.exit(not all(find_spec(n) for n in ('pygame','moderngl','cv2','numpy','scipy','pandas','sounddevice','soundfile','mutagen','pyloudnorm','pyfar','loguru','matplotlib','sympy','PIL')))" >> "%LWT_LOG%" 2>&1
if errorlevel 1 goto install_runtime
exit /b 0

:install_runtime
call :find_python
if errorlevel 1 exit /b 2
if exist "%LWT_PY%" (
    "%LWT_PY%" -B -c "import sys,sysconfig; sys.exit(not (sys.version_info[:2]==(3,12) and sysconfig.get_platform()=='win-amd64'))" >> "%LWT_LOG%" 2>&1
    if errorlevel 1 (
        echo Die vorhandene .venv ist ungueltig. Benenne sie um und starte erneut. >> "%LWT_LOG%"
        exit /b 2
    )
)
echo Erstinstallation: Richte Python-Umgebung und Player-Abhaengigkeiten ein.
echo Der Download kann einige Minuten dauern. Protokoll: "%LWT_LOG%"
if not exist "%LWT_PY%" (
    call :run_base -m venv "%LWT_ENV%"
    if errorlevel 1 exit /b 2
)
"%LWT_PY%" -u -m pip install --disable-pip-version-check --only-binary=:all: --require-hashes -r "%LWT_LOCK%" >> "%LWT_LOG%" 2>&1
if errorlevel 1 exit /b 2
"%LWT_PY%" -u -m pip check >> "%LWT_LOG%" 2>&1
exit /b %ERRORLEVEL%

:ensure_radio
"%LWT_PY%" -B -c "import av" >> "%LWT_LOG%" 2>&1
if not errorlevel 1 exit /b 0
echo Installiere den Audio-Decoder fuer Live-Radio.
"%LWT_PY%" -u -m pip install --disable-pip-version-check --only-binary=:all: --require-hashes -r "%LWT_ROOT%requirements-radio-win64.txt" >> "%LWT_LOG%" 2>&1
exit /b %ERRORLEVEL%

:ensure_vr
call :ensure_runtime
if errorlevel 1 exit /b 2
"%LWT_PY%" -B -c "from importlib.util import find_spec; import sys; sys.exit(find_spec('openvr') is None)" >> "%LWT_LOG%" 2>&1
if not errorlevel 1 exit /b 0
echo Installiere die optionale OpenVR-Anbindung.
"%LWT_PY%" -u -m pip install --disable-pip-version-check --only-binary=:all: --require-hashes -r "%LWT_ROOT%requirements-openvr-win64.txt" >> "%LWT_LOG%" 2>&1
exit /b %ERRORLEVEL%

:find_python
if exist "%LWT_PY%" (
    "%LWT_PY%" -B -c "import sys,sysconfig; sys.exit(not (sys.version_info[:2]==(3,12) and sysconfig.get_platform()=='win-amd64'))" >> "%LWT_LOG%" 2>&1
    if not errorlevel 1 (
        set "LWT_BASE=venv"
        exit /b 0
    )
)

:find_system_python
where py >nul 2>&1
if not errorlevel 1 (
    py -3.12 -B -c "import sys,sysconfig; sys.exit(not (sys.version_info[:2]==(3,12) and sysconfig.get_platform()=='win-amd64'))" >> "%LWT_LOG%" 2>&1
    if not errorlevel 1 (
        set "LWT_BASE=py"
        exit /b 0
    )
)
where python >nul 2>&1
if not errorlevel 1 (
    python -B -c "import sys,sysconfig; sys.exit(not (sys.version_info[:2]==(3,12) and sysconfig.get_platform()=='win-amd64'))" >> "%LWT_LOG%" 2>&1
    if not errorlevel 1 (
        set "LWT_BASE=python"
        exit /b 0
    )
)
echo Python 3.12 x64 wurde weder ueber py -3.12 noch ueber python gefunden. >> "%LWT_LOG%"
echo Installiere Python 3.12 x64 und starte diese BAT erneut. >> "%LWT_LOG%"
exit /b 2

:run_base
if "%LWT_BASE%"=="venv" (
    "%LWT_PY%" -u -B %* >> "%LWT_LOG%" 2>&1
    exit /b
)
if "%LWT_BASE%"=="py" (
    py -3.12 -u -B %* >> "%LWT_LOG%" 2>&1
    exit /b
)
python -u -B %* >> "%LWT_LOG%" 2>&1
exit /b %ERRORLEVEL%
