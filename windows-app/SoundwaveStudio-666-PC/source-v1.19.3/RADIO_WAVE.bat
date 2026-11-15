@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0" || exit /b 1
call :preflight
set "RC=%errorlevel%"
if not "%RC%"=="0" goto finish
if "%~1"=="" goto menu

call :action "%~1"
set "RC=%errorlevel%"
:finish
if not "%RC%"=="0" if /i not "%~2"=="/nopause" pause
popd
exit /b %RC%

:menu
echo.
echo RADIO WAVE v6.66
echo   1 - Player starten
echo   2 - Windows-Installer und portable EXE bauen
echo   3 - Portables ZIP bauen
echo   4 - Ende
choice /c 1234 /n /m "Auswahl: "
set "SELECTION=%errorlevel%"
if "%SELECTION%"=="4" goto menuEnd
if "%SELECTION%"=="0" goto menuCancel
if "%SELECTION%"=="255" goto menuError
set "MODE="
if "%SELECTION%"=="1" set "MODE=start"
if "%SELECTION%"=="2" set "MODE=installer"
if "%SELECTION%"=="3" set "MODE=portable"
if not defined MODE goto menuError
echo.
call :action "%MODE%"
set "RC=%errorlevel%"
if "%RC%"=="0" echo Vorgang abgeschlossen.
if not "%RC%"=="0" echo Vorgang fehlgeschlagen. Exitcode: %RC%
goto menu

:menuEnd
popd
exit /b 0

:menuCancel
popd
exit /b 130

:menuError
echo FEHLER: Die Menueauswahl ist fehlgeschlagen.
pause
popd
exit /b 1

:action
set "MODE=%~1"
if /i "%MODE%"=="check" exit /b 0
if /i "%MODE%"=="start" goto checkRuntime
if /i "%MODE%"=="installer" goto checkRuntime
if /i "%MODE%"=="portable" goto checkRuntime
echo Nutzung: RADIO_WAVE.bat [start^|installer^|portable] [/nopause]
exit /b 2

:preflight
echo [SYSTEM] Pruefe Projekt, Windows-Werkzeuge und Build-Abhaengigkeiten.
if not exist "package.json" (echo FEHLER: Bitte den vollstaendigen Ordner entpacken. & exit /b 1)
if not exist "package-lock.json" (echo FEHLER: package-lock.json fehlt. & exit /b 1)
set "PATH=%SystemRoot%\System32\WindowsPowerShell\v1.0;%ProgramFiles%\PowerShell\7;%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
call :ensureNode || exit /b 1
call :ensurePowerShell || exit /b 1
node.exe --version || exit /b 1
call npm.cmd --version || exit /b 1
call :ensureDependencies || exit /b 1
set "ELECTRON_RUN_AS_NODE="
set "ELECTRON_OVERRIDE_DIST_PATH="
set "ELECTRON_SKIP_BINARY_DOWNLOAD="
set "ELECTRON_INSTALL_PLATFORM="
set "ELECTRON_INSTALL_ARCH="
call :ensureElectron || exit /b 1
call :reportTools
call npm.cmd test || exit /b
call npm.cmd run check:release || exit /b
call npm.cmd run check:radio-wave-release || exit /b
echo PASS: RADIO WAVE Systempruefung
exit /b 0

:ensureNode
where node.exe >nul 2>nul || goto installNode
where npm.cmd >nul 2>nul || goto installNode
call :updateNode || exit /b 1
call :nodeVersionOk || goto installNode
exit /b 0

:nodeVersionOk
node.exe -e "const [major,minor]=process.versions.node.split('.').map(Number);process.exit(major>22||(major===22&&minor>=12)?0:1)" >nul 2>nul
exit /b %errorlevel%

:installNode
where winget.exe >nul 2>nul || (echo FEHLER: Node.js oder npm fehlt und WinGet ist nicht verfuegbar. Bitte App Installer und WinGet in Windows bereitstellen. & exit /b 1)
echo [INSTALL] Installiere Node.js LTS und npm mit WinGet.
winget.exe install --id OpenJS.NodeJS.LTS --exact --source winget --accept-package-agreements --accept-source-agreements --silent --disable-interactivity
if errorlevel 1 (echo FEHLER: Node.js-Installation fehlgeschlagen. & exit /b 1)
where npm.cmd >nul 2>nul && call :nodeVersionOk && exit /b 0
set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%PATH%"
where node.exe >nul 2>nul || (echo FEHLER: Installiertes node.exe ist nicht im PATH verfuegbar. & exit /b 1)
where npm.cmd >nul 2>nul || (echo FEHLER: Installiertes npm.cmd ist nicht im PATH verfuegbar. & exit /b 1)
call :nodeVersionOk || (echo FEHLER: Node.js 22.12 oder neuer ist erforderlich. & exit /b 1)
exit /b 0

:updateNode
where winget.exe >nul 2>nul || (echo [WARNUNG] WinGet fehlt: Node.js kann nicht automatisch auf Updates geprueft werden. & exit /b 0)
set "NODE_PACKAGE="
call :detectNodePackage OpenJS.NodeJS.LTS
if not defined NODE_PACKAGE call :detectNodePackage OpenJS.NodeJS
if not defined NODE_PACKAGE (
    echo [WARNUNG] Node.js ist nicht als WinGet-Paket erkannt; automatische Updates sind nicht verfuegbar.
    exit /b 0
)
echo [UPDATE] WinGet prueft und aktualisiert bei Bedarf: %NODE_PACKAGE%
winget.exe upgrade --id "%NODE_PACKAGE%" --exact --source winget --skip-dependencies --accept-package-agreements --accept-source-agreements --silent --disable-interactivity
set "UPDATE_RC=%errorlevel%"
if "%UPDATE_RC%"=="0" exit /b 0
if "%UPDATE_RC%"=="-1978335189" exit /b 0
if "%UPDATE_RC%"=="-1978335212" (
    echo [UPDATE] WinGet findet das Paket nicht mehr. Die lokale Node.js-Version wird geprueft.
    exit /b 0
)
echo FEHLER: Node.js-Update fehlgeschlagen. WinGet-Exitcode: %UPDATE_RC%.
exit /b 1

:detectNodePackage
winget.exe list --id "%~1" --exact --source winget --disable-interactivity 2>nul | findstr.exe /l /c:" %~1 " >nul
if not errorlevel 1 set "NODE_PACKAGE=%~1"
exit /b 0

:ensurePowerShell
where powershell.exe >nul 2>nul && exit /b 0
where pwsh.exe >nul 2>nul && exit /b 0
where winget.exe >nul 2>nul || (echo FEHLER: PowerShell fehlt und WinGet ist nicht verfuegbar. & exit /b 1)
echo [INSTALL] Installiere PowerShell mit WinGet.
winget.exe install --id Microsoft.PowerShell --exact --source winget --accept-package-agreements --accept-source-agreements --silent --disable-interactivity
if errorlevel 1 (echo FEHLER: PowerShell-Installation fehlgeschlagen. & exit /b 1)
where pwsh.exe >nul 2>nul || (echo FEHLER: Installiertes pwsh.exe ist nicht im PATH verfuegbar. & exit /b 1)
exit /b 0

:dependenciesOk
if not exist "node_modules\.bin\electron-builder.cmd" exit /b 1
if not exist "node_modules\.bin\electron-packager.cmd" exit /b 1
node.exe -e "const l=require('./package-lock.json');for(const n of Object.keys(require('./package.json').devDependencies||{})){const p='./node_modules/'+n+'/package.json';try{if(require(p).version!==l.packages['node_modules/'+n].version)process.exit(1)}catch(e){process.exit(1)}}" >nul 2>nul || exit /b 1
call npm.cmd ls --all --include=dev >nul 2>nul || exit /b 1
exit /b 0

:ensureDependencies
call :dependenciesOk && exit /b 0
echo [INSTALL] Installiere oder aktualisiere Projektwerkzeuge gemaess package-lock.json.
call npm.cmd install --include=dev --foreground-scripts --ignore-scripts=false --no-audit --no-fund || (echo FEHLER: npm-Abhaengigkeiten konnten nicht installiert werden. & exit /b 1)
call :dependenciesOk || (echo FEHLER: Projektabhaengigkeiten sind nach der Installation unvollstaendig. & exit /b 1)
exit /b 0

:ensureElectron
node.exe scripts\repair-electron-runtime.cjs --check && exit /b 0
echo [REPARATUR] Electron-Runtime fehlt oder ist ungueltig. Lade die passende Version.
node.exe scripts\repair-electron-runtime.cjs || (echo FEHLER: Electron-Reparatur fehlgeschlagen. & exit /b 1)
node.exe scripts\repair-electron-runtime.cjs --check || (echo FEHLER: Electron ist nach der Reparatur nicht startfaehig. & exit /b 1)
exit /b 0

:reportTools
echo [OK] PowerShell
if exist "node_modules\electron\dist\electron.exe" (echo [OK] Electron-Runtime) else echo [FEHLT] Electron-Runtime: node_modules\electron\dist\electron.exe
if exist "node_modules\.bin\electron-builder.cmd" (echo [OK] NSIS-Buildwerkzeug) else echo [FEHLT] electron-builder fuer NSIS.
if exist "node_modules\.bin\electron-packager.cmd" (echo [OK] Portable-Buildwerkzeug) else echo [FEHLT] electron-packager fuer das portable ZIP.
exit /b 0

:checkRuntime
call :ensureDependencies || exit /b 1
call :ensureElectron || exit /b 1
goto run

:run
if /i "%MODE%"=="installer" goto installer
if /i "%MODE%"=="portable" goto portable
call npm.cmd run prepare:branding || exit /b
call npm.cmd run check:radio-wave-release || exit /b
call npm.cmd start
exit /b

:installer
call npm.cmd run dist || exit /b
if not exist "dist\RADIO-WAVE-v6.66-Setup.exe" (echo FEHLER: Installer fehlt. & exit /b 1)
if not exist "dist\RADIO-WAVE-v6.66-Portable.exe" (echo FEHLER: Portable EXE fehlt. & exit /b 1)
echo PASS: dist\RADIO-WAVE-v6.66-Setup.exe
echo PASS: dist\RADIO-WAVE-v6.66-Portable.exe
exit /b 0

:portable
call npm.cmd run package || exit /b
if not exist "dist\SoundwaveStudio-portable-win-x64.zip" (echo FEHLER: Portable ZIP fehlt. & exit /b 1)
echo PASS: dist\SoundwaveStudio-portable-win-x64.zip
exit /b 0
