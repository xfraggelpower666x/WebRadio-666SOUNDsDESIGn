<#
############################################################
# 666SOUNDsDESIGn — PC Discord Player Card Sender
# Created: 2026-05-05
# Modified: 2026-05-05
# Version: V1.0
# Purpose: Windows PowerShell sender for Discord Embed + Player Button.
# Change Summary:
# - Sends to Cloudflare Worker endpoint by default.
# - Optional Admin Token header supported.
# - No Discord Webhook URL needed on PC when Worker is configured.
############################################################
#>

param(
  [string]$Endpoint = "https://webradio.666soundsdesign-broadcaster.com/api/discord/player-card",
  [string]$AdminToken = ""
)

$ErrorActionPreference = "Stop"

$payload = @{
  playerUrl = "https://webradio.666soundsdesign-broadcaster.com"
  title = "🎧 666SOUNDsDESIGn WebRadio"
  nowPlaying = "Live Cyber Radio Player"
  source = "Mainstream / Backstream"
  listeners = "live"
  previewImage = "https://webradio.666soundsdesign-broadcaster.com/assets/discord/discord-preview.svg"
  avatarUrl = "https://webradio.666soundsdesign-broadcaster.com/assets/images/logo-neon.png"
} | ConvertTo-Json -Depth 10

$headers = @{ "Content-Type" = "application/json" }
if ($AdminToken -ne "") {
  $headers["x-admin-token"] = $AdminToken
}

Write-Host "666SOUNDsDESIGn Discord Player Card Sender V1" -ForegroundColor Cyan
Write-Host "Endpoint: $Endpoint" -ForegroundColor DarkCyan

try {
  $response = Invoke-RestMethod -Uri $Endpoint -Method Post -Headers $headers -Body $payload
  Write-Host "OK: Discord Player Card gesendet." -ForegroundColor Green
  $response | ConvertTo-Json -Depth 10
} catch {
  Write-Host "FEHLER: Discord Player Card konnte nicht gesendet werden." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
