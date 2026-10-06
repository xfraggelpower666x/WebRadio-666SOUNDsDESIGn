# Restore the v1.10 text-source snapshot from the four repository chunks.
$ErrorActionPreference = "Stop"

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$PartsDir = Join-Path $Here "text-backup"
$Zip = Join-Path $Here "TEXT_SOURCE_BUNDLE_V1_10.zip"
$Out = Join-Path $Here "RESTORED_TEXT_SOURCE"

$PartNames = @(
  "TEXT_SOURCE_BUNDLE_V1_10.part01.b64",
  "TEXT_SOURCE_BUNDLE_V1_10.part02.b64",
  "TEXT_SOURCE_BUNDLE_V1_10.part03.b64",
  "TEXT_SOURCE_BUNDLE_V1_10.part04.b64"
)

$Builder = New-Object System.Text.StringBuilder
foreach ($Name in $PartNames) {
  $Path = Join-Path $PartsDir $Name
  if (!(Test-Path -LiteralPath $Path)) {
    throw "Missing text backup chunk: $Path"
  }
  [void]$Builder.Append((Get-Content -Raw -LiteralPath $Path).Trim())
}

$Base64 = $Builder.ToString()
if ($Base64.Length -ne 21072) {
  throw "Unexpected combined Base64 length: $($Base64.Length), expected 21072"
}

$Raw = [Convert]::FromBase64String($Base64)
[IO.File]::WriteAllBytes($Zip, $Raw)

if (Test-Path -LiteralPath $Out) {
  Remove-Item -Recurse -Force -LiteralPath $Out
}
Expand-Archive -LiteralPath $Zip -DestinationPath $Out -Force

Write-Host "PASS - v1.10 text source restored to $Out"
