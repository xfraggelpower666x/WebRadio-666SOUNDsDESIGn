$ErrorActionPreference = "Stop"

function Write-Status($label, $value) {
    Write-Host ("[{0}] {1}" -f $label, $value)
}

Write-Host "============================================================"
Write-Host " 666 LIGHT ORCHESTRA - BLUETOOTH RECOVERY"
Write-Host "============================================================"
Write-Host ""

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

Write-Status "INFO" ("Administrator: " + $admin)

try {
    $svc = Get-Service -Name bthserv -ErrorAction Stop
    Write-Status "INFO" ("Bluetooth Support Service: " + $svc.Status)
    if ($svc.Status -ne "Running") {
        Start-Service -Name bthserv
        Start-Sleep -Seconds 2
        $svc = Get-Service -Name bthserv
        Write-Status "PASS" ("Bluetooth Support Service: " + $svc.Status)
    } else {
        Restart-Service -Name bthserv -Force
        Start-Sleep -Seconds 2
        $svc = Get-Service -Name bthserv
        Write-Status "PASS" ("Bluetooth Support Service restarted: " + $svc.Status)
    }
} catch {
    Write-Status "WARN" ("Bluetooth service recovery failed: " + $_.Exception.Message)
}

try {
    if (Get-Command pnputil.exe -ErrorAction SilentlyContinue) {
        Write-Status "INFO" "Requesting Windows hardware rescan..."
        & pnputil.exe /scan-devices | Out-Host
        if ($LASTEXITCODE -eq 0) {
            Write-Status "PASS" "Hardware rescan completed."
        } else {
            Write-Status "WARN" ("pnputil returned exit code " + $LASTEXITCODE)
        }
    } else {
        Write-Status "WARN" "pnputil.exe not available."
    }
} catch {
    Write-Status "WARN" ("Hardware rescan failed: " + $_.Exception.Message)
}

Start-Sleep -Seconds 2

$devices = @(Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue |
    Select-Object FriendlyName,Status,InstanceId,Problem)

$physical = @($devices | Where-Object {
    $_.FriendlyName -and
    $_.FriendlyName -notmatch "Enumerator|RFCOMM|Protocol TDI|Personal Area Network|Generic Attribute Service|Device Identification Service"
})

Write-Host ""
if ($physical.Count -gt 0) {
    Write-Status "RESULT" ("Physical Bluetooth candidates: " + $physical.Count)
    $physical | Format-Table -AutoSize | Out-Host
} else {
    Write-Status "RESULT" "No physical Bluetooth adapter candidate is visible to Windows."
}

Write-Host ""
Write-Host "No driver was removed. No Bluetooth device was deleted. No reboot was forced."
