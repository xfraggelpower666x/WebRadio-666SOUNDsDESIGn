$ErrorActionPreference = "Continue"
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$diagDir = Join-Path $base "diagnostics"
$diagReport = Join-Path $diagDir "LIGHT_ORCHESTRA_DIAGNOSTICS.json"
$summaryPath = Join-Path $diagDir "LIGHT_ORCHESTRA_SYSTEM_CHECK.json"

New-Item -ItemType Directory -Force -Path $diagDir | Out-Null

Write-Host "============================================================"
Write-Host " 666 LIGHT ORCHESTRA - SYSTEM CHECK"
Write-Host "============================================================"
Write-Host ""

$packageState = "NOT_AVAILABLE"
$verifyScript = Join-Path $base "VERIFY_PACKAGE.ps1"
if (Test-Path $verifyScript) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyScript
    $packageState = if ($LASTEXITCODE -eq 0) { "PASS" } else { "FAIL" }
}

$diagState = "FAIL"
$diagExe = Join-Path $base "dist\666_LIGHT_ORCHESTRA_DIAGNOSTICS.exe"
$diagSource = Join-Path $base "666_light_orchestra_diagnostics.py"
$venvPython = Join-Path $base ".venv\Scripts\python.exe"

if (Test-Path $diagExe) {
    & $diagExe
    if ($LASTEXITCODE -eq 0) { $diagState = "PASS" }
} elseif ((Test-Path $diagSource) -and (Test-Path $venvPython)) {
    & $venvPython $diagSource
    if ($LASTEXITCODE -eq 0) { $diagState = "PASS" }
} elseif (Test-Path $diagSource) {
    & python $diagSource
    if ($LASTEXITCODE -eq 0) { $diagState = "PASS" }
}

$next = @()
$btState = "UNKNOWN"
$bleCount = 0
$goveeState = "UNKNOWN"
$goveeNetwork = "UNKNOWN"

if (Test-Path $diagReport) {
    try {
        $diag = Get-Content $diagReport -Raw | ConvertFrom-Json
        $btState = [string]$diag.bluetooth.adapter_state
        $bleCount = @($diag.ble_scan.devices).Count
        $goveeState = if ($diag.govee.ok) { "FOUND" } else { "NOT_FOUND" }
        $goveeNetwork = [string]$diag.govee_network.reason

        if (-not $diag.bluetooth.ok) {
            $next += "Run RUN_BLUETOOTH_RECOVERY.bat, then BLUETOOTH CHECK."
        } elseif ($bleCount -eq 0) {
            $next += "Bluetooth is ready but no BLE lamps are visible: power lamps, close phone apps that may hold BLE connections, then SEARCH BLE."
        } else {
            $next += "BLE devices are visible: bind each physical lamp to the correct slot, then CONNECT / VERIFY."
        }

        if (-not $diag.govee.ok) {
            if ($diag.govee_network.ok) {
                $next += "Govee IP is network-reachable but LAN devStatus failed: check Govee LAN Control and Windows firewall/UDP path."
            } else {
                $next += "Govee is not network-confirmed: verify H6047 IP, Wi-Fi/LAN, and router presence."
            }
        } else {
            $next += "Govee read-only discovery/probe passed; use session controls only while the probe gate is fresh."
        }

        $lenzeBound = @($diag.registry | Where-Object { $_.family -eq "lenze" -and $_.windows_ble_address }).Count
        $ocBound = @($diag.registry | Where-Object { $_.family -eq "magic_lantern" -and $_.windows_ble_address }).Count
        if ($lenzeBound -lt 2) { $next += "LENZE: bind remaining Windows BLE addresses." }
        if ($ocBound -lt 4) { $next += "OC21W: bind remaining Windows BLE addresses." }
        $next += "LENZE/OC21W writes remain blocked until real protocol evidence closes their hardware gates."
    } catch {
        $next += "Diagnostics report could not be parsed: $($_.Exception.Message)"
    }
} else {
    $next += "Diagnostics report was not created."
}

$summary = [ordered]@{
    schema = 1
    kind = "LIGHT_ORCHESTRA_SYSTEM_CHECK"
    created_at = (Get-Date).ToUniversalTime().ToString("o")
    package_integrity = $packageState
    diagnostics = $diagState
    bluetooth_adapter_state = $btState
    visible_ble_devices = $bleCount
    govee = $goveeState
    govee_network = $goveeNetwork
    hardware_writes_performed = 0
    next_actions = @($next)
}
$summary | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $summaryPath

Write-Host ""
Write-Host "-------------------- RESULT --------------------"
Write-Host ("Package integrity : " + $packageState)
Write-Host ("Diagnostics       : " + $diagState)
Write-Host ("Bluetooth adapter : " + $btState)
Write-Host ("Visible BLE       : " + $bleCount)
Write-Host ("Govee             : " + $goveeState)
Write-Host ("Govee network     : " + $goveeNetwork)
Write-Host "Hardware writes   : 0"
Write-Host ""
Write-Host "NEXT REAL ACTIONS"
foreach ($item in $next) {
    Write-Host (" - " + $item)
}
Write-Host ""
Write-Host ("Summary: " + $summaryPath)

if ($diagState -ne "PASS") { exit 20 }
exit 0
