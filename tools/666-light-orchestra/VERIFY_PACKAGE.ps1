$ErrorActionPreference = "Stop"
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $base "WINDOWS_BUILD_MANIFEST.json"

Write-Host "============================================================"
Write-Host " 666 LIGHT ORCHESTRA - PACKAGE VERIFY"
Write-Host "============================================================"

if (-not (Test-Path $manifestPath)) {
    Write-Host "[ERROR] WINDOWS_BUILD_MANIFEST.json is missing."
    exit 10
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$failed = @()

foreach ($entry in $manifest.files) {
    $rel = [string]$entry.path
    $path = Join-Path $base ($rel -replace "/", "\")
    if (-not (Test-Path $path)) {
        $failed += "MISSING $rel"
        continue
    }
    $actual = (Get-FileHash $path -Algorithm SHA256).Hash.ToLower()
    $expected = ([string]$entry.sha256).ToLower()
    if ($actual -ne $expected) {
        $failed += "HASH_MISMATCH $rel"
    }
}

if ($failed.Count -gt 0) {
    Write-Host "[FAILED] Package integrity problems:"
    $failed | ForEach-Object { Write-Host ("  " + $_) }
    exit 20
}

Write-Host ("[PASS] Verified " + $manifest.files.Count + " package files.")
Write-Host ("[INFO] Source commit: " + $manifest.source_commit)
Write-Host ("[INFO] Release class: " + $manifest.release_class)
exit 0
