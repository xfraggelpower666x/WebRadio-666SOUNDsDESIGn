# 666SOUNDsDESIGn: optional legacy DirectX SDK June 2010 manager.
# No automatic system mutation; supplied Microsoft URL, signed download only.
[CmdletBinding()]
param([ValidateSet('check','download','install')][string]$Action='check')
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$Root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if ($env:RADIO_WAVE_CYBER_STUDIO_DATA) { $Root=$env:RADIO_WAVE_CYBER_STUDIO_DATA }
$Logs=Join-Path $Root 'logs'; New-Item -ItemType Directory -Force -Path $Logs | Out-Null
$Log=Join-Path $Logs ('directx_'+$Action+'_'+(Get-Date -Format 'yyyyMMdd_HHmmss_fff')+'.log')
$Url='https://download.microsoft.com/download/a/e/7/ae743f1f-632b-4809-87a9-aa1bb3458e31/DXSDK_Jun10.exe'
$DestDir=Join-Path $Root 'downloads'; $Dest=Join-Path $DestDir 'DXSDK_Jun10.exe'
$ErrorCode=0; $Started=$false
function Detect-SDK {
  $paths=@()
  if ($env:DXSDK_DIR) { $paths+= $env:DXSDK_DIR }
  foreach($reg in @('HKLM:\SOFTWARE\Microsoft\DirectX SDK','HKLM:\SOFTWARE\WOW6432Node\Microsoft\DirectX SDK')) {
    try { $v=Get-ItemProperty -Path $reg -ErrorAction Stop
      foreach($name in @('InstallPath','InstallDir','DXSDK_DIR')) { if($v.$name) {$paths += $v.$name} }
    } catch {}
  }
  foreach($pf in @(${env:ProgramFiles(x86)},$env:ProgramFiles)) {
    if ($pf) { $paths+= (Join-Path $pf 'Microsoft DirectX SDK (June 2010)') }
  }
  foreach($candidate in ($paths | Select-Object -Unique)) {
    if ((Test-Path (Join-Path $candidate 'Include\d3dx9.h')) -and (Test-Path (Join-Path $candidate 'Lib\x86\d3dx9.lib'))) {return $candidate}
  }
  return $null
}
function Verify-Signature([string]$File) {
  $signature=Get-AuthenticodeSignature -FilePath $File
  if ($signature.Status -ne 'Valid' -or -not $signature.SignerCertificate -or $signature.SignerCertificate.Subject -notmatch 'Microsoft') {
    throw "BLOCKIERT: Ungueltige Microsoft-Signatur ($($signature.Status)); Datei wird NICHT ausgefuehrt."
  }
  Write-Host "Microsoft-Signatur OK: $($signature.SignerCertificate.Subject)"
  $hash=(Get-FileHash -Algorithm SHA256 -Path $File).Hash
  Write-Host "SHA256: $hash"
  return $hash
}
try {
 Start-Transcript -Path $Log -Force | Out-Null; $Started=$true
 Write-Host "DirectX SDK June 2010 Manager | $Action"
 Write-Host 'Dieses Legacy-SDK ist NICHT die DirectX End-User Runtime und wird fuer Python Preset Studio nicht zwingend gebraucht.'
 $sdk=Detect-SDK
 if($sdk) {Write-Host "SDK Installationsordner erkannt: $sdk"}
 else {Write-Host 'SDK nicht anhand von Header+Library erkannt.'}
 if($Action -eq 'check') {
   if(Test-Path $Dest) { Write-Host "Vorhandener Download: $Dest"; try {Verify-Signature $Dest | Out-Null} catch {Write-Warning $_} }
   Write-Host 'CHECK: Es wurde nichts heruntergeladen oder installiert.'
 } elseif ($sdk) {
   Write-Host 'SDK ist bereits vorhanden. Keine erneute Installation oder Ersetzung.'
 } else {
   # Preflight BEFORE the large SDK download. Checking does not change Windows.
   if ($Action -eq 'install') {
     $netfx=(Get-WindowsOptionalFeature -Online -FeatureName NetFx3 -ErrorAction Stop).State
     Write-Host "NetFx3 Feature Status: $netfx"
     if ($netfx -ne 'Enabled') { throw 'WRITE_BLOCKED: .NET Framework 3.5 (NetFx3) ist nicht aktiv. CHECK_NETFX3.bat ausfuehren, bei Bedarf ENABLE_NETFX3.bat als Administrator; kein SDK-Download oder Setup gestartet.' }
   }
   New-Item -ItemType Directory -Force -Path $DestDir | Out-Null
   if (Test-Path $Dest) { Verify-Signature $Dest | Out-Null }
   else {
     $Partial=Join-Path $DestDir ('DXSDK_Jun10.'+[guid]::NewGuid().ToString('N')+'.partial')
     try {
       Write-Host "Download von Microsoft: $Url"
       Invoke-WebRequest -Uri $Url -OutFile $Partial -UseBasicParsing -MaximumRedirection 5
       if ((Get-Item $Partial).Length -lt 500MB) {throw 'Download unvollstaendig (unter 500 MiB).'}
       Verify-Signature $Partial | Out-Null
       Move-Item -LiteralPath $Partial -Destination $Dest -ErrorAction Stop
     } finally { if(Test-Path $Partial) {Remove-Item $Partial -Force -ErrorAction SilentlyContinue} }
   }
   if ($Action -eq 'download') { Write-Host "DOWNLOAD_OK: $Dest. Keine Installation ausgefuehrt." }
   else {
     # SDK install prerequisite only: never auto-activate Windows components.
     $netfx=(Get-WindowsOptionalFeature -Online -FeatureName NetFx3 -ErrorAction Stop).State
     Write-Host "NetFx3 Feature Status: $netfx"
     if($netfx -ne 'Enabled') {
       throw 'WRITE_BLOCKED: .NET Framework 3.5 (NetFx3) ist nicht aktiv. Erst CHECK_NETFX3.bat verwenden; bei Bedarf ENABLE_NETFX3.bat mit Administratorrechten starten. SDK nicht installiert.'
     }
     Write-Host 'ACHTUNG: Microsoft beschreibt .NET-3.5-Voraussetzung und moeglichen S1023/VC++-2010-Konflikt.'
     Write-Host 'Kein automatisches Entfernen/Ersetzen von VC++ Redistributables.'
     Write-Host 'Starte signaturgeprueftes Originalsetup interaktiv; UAC/Benutzerentscheidung notwendig.'
     $proc=Start-Process -FilePath $Dest -Wait -PassThru
     Write-Host "Installer ExitCode: $($proc.ExitCode)"
     if($proc.ExitCode -ne 0) {throw "DirectX SDK Setup fehlgeschlagen: ExitCode $($proc.ExitCode). S1023 und DirectX.log im Windows-System pruefen."}
     $sdk=Detect-SDK
     if(-not $sdk) {throw 'Setup beendet, aber SDK-Nachweis (d3dx9.h + d3dx9.lib) fehlt: READBACK_PENDING.'}
     Write-Host "INSTALL_READBACK_OK: $sdk"
   }
 }
} catch { $ErrorCode=1; Write-Host "DIRECTX ERROR: $_" -ForegroundColor Red; Write-Host $_.ScriptStackTrace }
finally { if($Started) {try{Stop-Transcript | Out-Null}catch{}}; try{Copy-Item $Log (Join-Path $Logs 'LATEST_DIRECTX.log') -Force}catch{} }
exit $ErrorCode
