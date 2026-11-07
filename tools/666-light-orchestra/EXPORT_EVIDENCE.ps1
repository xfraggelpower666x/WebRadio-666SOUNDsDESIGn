$ErrorActionPreference = "Stop"
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$exportRoot = Join-Path $base ("exports\LIGHT_ORCHESTRA_EVIDENCE_" + $stamp)
$zip = $exportRoot + ".zip"

New-Item -ItemType Directory -Force -Path $exportRoot | Out-Null

$copied = @()

function Copy-IfExists($source, $destName) {
    if (Test-Path $source) {
        $dest = Join-Path $exportRoot $destName
        if ((Get-Item $source).PSIsContainer) {
            Copy-Item $source $dest -Recurse -Force
        } else {
            Copy-Item $source $dest -Force
        }
        $script:copied += $destName
    }
}

Copy-IfExists (Join-Path $base "diagnostics\LIGHT_ORCHESTRA_DIAGNOSTICS.json") "LIGHT_ORCHESTRA_DIAGNOSTICS.json"
Copy-IfExists (Join-Path $base "diagnostics\LIGHT_ORCHESTRA_SYSTEM_CHECK.json") "LIGHT_ORCHESTRA_SYSTEM_CHECK.json"

$localRoot = Join-Path $HOME ".666soundsdesign\light-orchestra"
Copy-IfExists (Join-Path $localRoot "devices.local.json") "devices.local.json"
Copy-IfExists (Join-Path $localRoot "evidence") "evidence"

$manifestFiles = Get-ChildItem $exportRoot -File -Recurse | Sort-Object FullName | ForEach-Object {
    [ordered]@{
        path = $_.FullName.Substring($exportRoot.Length + 1).Replace("\","/")
        size = $_.Length
        sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower()
    }
}

$manifest = [ordered]@{
    schema = 1
    kind = "LIGHT_ORCHESTRA_READ_ONLY_EVIDENCE_EXPORT"
    created_at = (Get-Date).ToUniversalTime().ToString("o")
    hardware_writes_performed = 0
    copied_sources = @($copied)
    files = @($manifestFiles)
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 (Join-Path $exportRoot "EVIDENCE_EXPORT_MANIFEST.json")

Compress-Archive -Path (Join-Path $exportRoot "*") -DestinationPath $zip -CompressionLevel Optimal -Force
$hash = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()

Write-Host "============================================================"
Write-Host " 666 LIGHT ORCHESTRA - EVIDENCE EXPORT"
Write-Host "============================================================"
Write-Host ("[PASS] ZIP: " + $zip)
Write-Host ("[PASS] SHA256: " + $hash)
Write-Host ("[INFO] Hardware writes performed: 0")
