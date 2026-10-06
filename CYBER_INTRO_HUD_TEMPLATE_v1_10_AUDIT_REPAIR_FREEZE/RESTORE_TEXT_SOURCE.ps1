# Decode the repository text-source snapshot.
$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$B64 = Join-Path $Here "TEXT_SOURCE_BUNDLE_V1_10.zip.b64"
$Zip = Join-Path $Here "TEXT_SOURCE_BUNDLE_V1_10.zip"
$Out = Join-Path $Here "RESTORED_TEXT_SOURCE"
$raw = [Convert]::FromBase64String((Get-Content -Raw -LiteralPath $B64).Trim())
[IO.File]::WriteAllBytes($Zip, $raw)
if (Test-Path $Out) { Remove-Item -Recurse -Force $Out }
Expand-Archive -LiteralPath $Zip -DestinationPath $Out -Force
Write-Host "PASS - text source restored to $Out"
