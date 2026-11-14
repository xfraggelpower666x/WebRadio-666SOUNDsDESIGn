# 666SOUNDsDESIGn - Windows optional .NET Framework 3.5 (NetFx3) manager.
# No system changes without explicit -Action enable.
[CmdletBinding()]
param([ValidateSet('check','enable')][string]$Action='check')
$ErrorActionPreference='Stop'
$Root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Logs=Join-Path $Root 'logs'; New-Item -ItemType Directory -Force -Path $Logs | Out-Null
$Log=Join-Path $Logs ('netfx3_'+$Action+'_'+(Get-Date -Format 'yyyyMMdd_HHmmss_fff')+'.log')
$ErrorCode=0; $Started=$false
function Get-NetFx3State {
  $f=Get-WindowsOptionalFeature -Online -FeatureName NetFx3 -ErrorAction Stop
  return [string]$f.State
}
try {
 Start-Transcript -Path $Log -Force | Out-Null; $Started=$true
 Write-Host "NETFX3 Windows Feature Manager | $Action"
 $state=Get-NetFx3State
 Write-Host "NetFx3 Status: $state"
 if ($state -eq 'Enabled') {Write-Host 'NETFX3_READBACK_OK: Already enabled. No change.'}
 elseif($Action -eq 'check') { Write-Host 'NETFX3_CHECK_ONLY: No system changes.' }
 else {
   # Recheck before elevated change; never auto-elevate on studio startup.
   $identity=[Security.Principal.WindowsIdentity]::GetCurrent()
   $principal=New-Object Security.Principal.WindowsPrincipal($identity)
   if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
      throw 'WRITE_BLOCKED: Administratorrechte erforderlich. ENABLE_NETFX3.bat als Administrator starten.'
   }
   if($state -notin @('Disabled','DisabledWithPayloadRemoved')) {
      throw "WRITE_BLOCKED: Unbekannter Featurezustand '$state'; keine Aenderung."
   }
   Write-Host 'Aktiviere NetFx3 ausschliesslich ueber Windows DISM / Windows Update (keine externen EXE-Downloads).'
   & dism.exe /Online /Enable-Feature /FeatureName:NetFx3 /All /NoRestart
   $rc=$LASTEXITCODE
   Write-Host "DISM exit code: $rc"
   if($rc -notin @(0,3010,1641)) {throw "DISM failed with exit code $rc. Siehe Windows CBS.log / DISM.log."}
   $after=Get-NetFx3State
   Write-Host "Readback NetFx3: $after"
   if($after -ne 'Enabled') {throw "READBACK_PENDING: NetFx3 status $after; moeglicherweise Neustart erforderlich."}
   Write-Host 'NETFX3_READBACK_OK: Windows feature enabled.'
   if($rc -in @(3010,1641)) {Write-Warning 'Windows Neustart erforderlich.'}
 }
} catch { $ErrorCode=1; Write-Host "NETFX3 ERROR: $_" -ForegroundColor Red; Write-Host $_.ScriptStackTrace }
finally {if($Started){try{Stop-Transcript|Out-Null}catch{}};try{Copy-Item -LiteralPath $Log -Destination (Join-Path $Logs 'LATEST_NETFX3.log') -Force}catch{}}
exit $ErrorCode
