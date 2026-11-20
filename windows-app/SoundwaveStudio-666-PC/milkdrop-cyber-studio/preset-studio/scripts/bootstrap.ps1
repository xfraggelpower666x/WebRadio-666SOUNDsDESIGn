# 666SOUNDsDESIGn MilkDrop Preset Studio Bootstrap v0.6.0
# Windows PowerShell 5.1 / PowerShell 7; nur Projekt-venv wird aktualisiert.
[CmdletBinding()]
param([ValidateSet('start','build','check')][string]$Action = 'start')
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LogDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss_fff'
$Log = Join-Path $LogDir "bootstrap_${Action}_${Stamp}.log"
$Latest = Join-Path $LogDir 'LATEST.log'
$exitCode = 0
$transcriptActive = $false

function Note([string]$text) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $text" }
function Run([string]$File, [string[]]$ArgList) {
    Note "CMD: $File $($ArgList -join ' ')"
    & $File @ArgList
    $code = $LASTEXITCODE
    if ($code -ne 0) { throw "Prozess fehlgeschlagen (exit=$code): $File" }
}
function ValidPython([string]$exe) {
    if (-not $exe) { return $false }
    try {
        $result = & $exe -c 'import sys, tkinter; assert (3,10) <= sys.version_info[:2] < (3,15); print(sys.executable)' 2>$null
        return ($LASTEXITCODE -eq 0 -and $result)
    } catch { return $false }
}
function FindPython {
    # Windows-Launcher wird priorisiert; Store-Aliase werden durch den Laufzeittest verworfen.
    $launcher = Get-Command py -ErrorAction SilentlyContinue
    if ($launcher) {
        foreach ($tag in @('-3.13','-3.14','-3.12','-3.11','-3.10','-3')) {
            try {
                $p = & $launcher.Source $tag -c 'import sys; print(sys.executable)' 2>$null
                if ($LASTEXITCODE -eq 0 -and $p -and (ValidPython ($p | Select-Object -First 1))) {
                    return ($p | Select-Object -First 1).Trim()
                }
            } catch {}
        }
    }
    foreach ($name in @('python','python3')) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd -and (ValidPython $cmd.Source)) { return $cmd.Source }
    }
    foreach ($base in @($env:LOCALAPPDATA, $env:ProgramFiles)) {
        if (-not $base) { continue }
        foreach ($version in @('Python313','Python314','Python312','Python311','Python310')) {
            $p = Join-Path $base "Programs\Python\$version\python.exe"
            if (ValidPython $p) { return $p }
        }
    }
    return $null
}
function InstallPython {
    Note 'Keine kompatible Python+Tkinter-Installation gefunden; automatische Benutzerinstallation.'
    if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64' -and $env:PROCESSOR_ARCHITEW6432 -ne 'AMD64') {
        throw 'Automatischer Python-Fallback nur fuer Windows x64. Bitte Python 3.13 mit Tkinter installieren.'
    }
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Note 'Versuche offizielle Python-Installation ueber winget (ohne System-Upgrade vorhandener Versionen).'
        & $winget.Source install --id Python.Python.3.13 --exact --source winget --scope user --silent --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -eq 0) {
            $p = FindPython
            if ($p) { return $p }
        }
        Note 'winget unvollstaendig; versuche offiziellen Python.org-Installer.'
    }
    # Feste offizielle Version statt unkontrollierter Fremdquelle; Signaturprüfung vor Ausführung.
    $url = 'https://www.python.org/ftp/python/3.13.17/python-3.13.17-amd64.exe'
    $tempFile = Join-Path $env:TEMP ('666SD-python-' + [guid]::NewGuid().ToString('N') + '.exe')
    try {
        Note "Download von $url"
        Invoke-WebRequest -Uri $url -OutFile $tempFile -UseBasicParsing
        $signature = Get-AuthenticodeSignature -FilePath $tempFile
        if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Python Software Foundation') {
            throw "Installer-Signatur ungueltig: $($signature.Status) / $($signature.SignerCertificate.Subject)"
        }
        Note 'Signatur gueltig; installiere Python fuer aktuellen Benutzer inklusive pip und Tcl/Tk.'
        $p = Start-Process -FilePath $tempFile -ArgumentList @('/quiet','InstallAllUsers=0','Include_pip=1','Include_tcltk=1','Include_launcher=1','PrependPath=0','Shortcuts=0') -Wait -PassThru
        if ($p.ExitCode -ne 0) { throw "Python-Setup fehlgeschlagen: $($p.ExitCode)" }
        $found = FindPython
        if (-not $found) { throw 'Python nach Installation nicht gefunden. Windows ggf. neu starten und CHECK_TOOLS.bat ausfuehren.' }
        return $found
    } finally { Remove-Item $tempFile -Force -ErrorAction SilentlyContinue }
}
function PipPresent([string]$Python, [string]$Name) {
    & $Python -m pip show $Name 1>$null 2>$null
    return ($LASTEXITCODE -eq 0)
}
function UpgradePackage([string]$Python,[string]$Name,[string]$Requirement,[bool]$Required) {
    $installed = PipPresent $Python $Name
    Note "Paket $Name : $(if ($installed) {'vorhanden; Updatepruefung'} else {'fehlt; Installation'})"
    & $Python -m pip install --disable-pip-version-check --upgrade --upgrade-strategy only-if-needed $Requirement
    if ($LASTEXITCODE -ne 0) {
        if ($installed -and (PipPresent $Python $Name)) {
            Note "WARN: Update fehlgeschlagen/offline, vorhandene Version von $Name wird weiterverwendet."
        } elseif ($Required) {
            throw "Pflichtpaket $Name nicht installierbar (z.B. Internet/Proxy blockiert)."
        } else { Note "WARN: $Name fehlt; optionale Funktion bleibt deaktiviert." }
    }
}
function SetupVenv([string]$Python, [bool]$WantBuild) {
    $venv = Join-Path $Root '.venv'
    $exe = Join-Path $venv 'Scripts\python.exe'
    if (-not (ValidPython $exe)) {
        if (Test-Path $venv) {
            # Unbekannte/defekte venv niemals automatisch loeschen.
            throw "Bestehende .venv defekt. Bitte manuell pruefen/sichern: $venv"
        }
        Note 'Erstelle isolierte virtuelle Python-Umgebung.'
        Run -File $Python -ArgList @('-m','venv',$venv)
    }
    if (-not (ValidPython $exe)) { throw 'Tkinter in Projektumgebung nicht verfuegbar.' }
    & $exe -m pip --version
    if ($LASTEXITCODE -ne 0) { Run -File $exe -ArgList @('-m','ensurepip','--upgrade') }
    UpgradePackage $exe 'pip' 'pip' $true
    UpgradePackage $exe 'tkinterdnd2' 'tkinterdnd2>=0.4,<1' $false
    UpgradePackage $exe 'Pillow' 'Pillow>=10,<13' $false
    UpgradePackage $exe 'sounddevice' 'sounddevice>=0.4,<1' $false
    if ($WantBuild) { UpgradePackage $exe 'pyinstaller' 'pyinstaller>=6,<8' $true }
    return $exe
}
try {
    Start-Transcript -Path $Log -Force | Out-Null
    $transcriptActive = $true
    Note "666SD PRESET STUDIO v0.6.0 | Action=$Action | Root=$Root"
    Note 'Keine vorhandenen Presets oder globalen Python-Pakete werden geaendert.'
    $python = FindPython
    if (-not $python -and $Action -ne 'check') { $python = InstallPython }
    if (-not $python) { throw 'Python mit Tkinter nicht gefunden.' }
    Note "Python gefunden: $python"
    Run -File $python -ArgList @('-c','import tkinter; print("Tkinter OK")')
    $venvExe = Join-Path $Root '.venv\Scripts\python.exe'
    if ($Action -eq 'check') {
        Note "VENV vorhanden: $(Test-Path $venvExe)"
        if (Test-Path $venvExe) {
            Run -File $venvExe -ArgList @('-c','import tkinter; print("Projekt-Tkinter OK")')
            & $venvExe -m pip show tkinterdnd2
            & $venvExe -m pip show pyinstaller
            & $venvExe -m pip show pillow
        }
        Note 'CHECK abgeschlossen, keine Installation/Updates.'
    } else {
        $venvExe = SetupVenv $python ($Action -eq 'build')
        if ($Action -eq 'start') {
            Note 'Starte Preset Studio.'
            Run -File $venvExe -ArgList @((Join-Path $Root 'src\gui.py'))
        } else {
            Note 'Starte lokale Tests vor dem EXE-Build.'
            Run -File $venvExe -ArgList @('-m','unittest','discover','-s',(Join-Path $Root 'tests'),'-v')
            $dist = Join-Path $Root 'dist'
            $work = Join-Path $Root 'build'
            $spec = Join-Path $Root 'build_specs'
            # Vorhandene dist-Dateien bleiben erhalten; PyInstaller stoppt bei Namenskonflikt.
            $outfile = Join-Path $dist '666SD_Preset_Studio.exe'
            if (Test-Path $outfile) { throw "Build-Ziel existiert schon, kein Ueberschreiben: $outfile (vorher umbenennen/sichern)" }
            New-Item -ItemType Directory -Path $dist,$work,$spec -Force | Out-Null
            Note 'Baue portable Windows-Onefile-EXE (kein Python auf Zielsystem erforderlich).'
            Run -File $venvExe -ArgList @('-m','PyInstaller','--noconfirm','--clean','--onefile','--windowed',
                '--name','666SD_Preset_Studio','--distpath',$dist,'--workpath',$work,'--specpath',$spec,
                '--collect-all','tkinterdnd2','--collect-all','PIL',(Join-Path $Root 'src\gui.py'))
            if (-not (Test-Path $outfile)) { throw 'PyInstaller hat keine EXE erzeugt.' }
            Note "BUILD ERFOLGREICH: $outfile"
            Note 'EXE ist ungezeichnet; Windows SmartScreen kann eine Warnung zeigen.'
        }
    }
    Note 'FERTIG'
} catch {
    $exitCode = 1
    Write-Host "FEHLER: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace
} finally {
    if ($transcriptActive) { try { Stop-Transcript | Out-Null } catch {} }
    try { Copy-Item $Log $Latest -Force } catch { Write-Host "Warnung: LATEST.log konnte nicht geschrieben werden: $_" }
}
exit $exitCode
