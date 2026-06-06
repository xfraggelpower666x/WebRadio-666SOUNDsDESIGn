# REPORT v35.9 — STREAM WATCHDOG PATCH2 REBASE

## Basis
- Source: WebRadio-666SOUNDsDESIGn_FULL_REPO_v35.8_TASK8_CUSTOM_PLAYER_HEADER_LIVEHUD.zip
- Patchquelle: WebRadio-666SOUNDsDESIGn_STREAM_WATCHDOG_V1_PATCH2_2026-06-04.zip

## Entscheidung
Die hochgeladenen Watchdog-ZIPs sind aelter als v35.8 und enthalten nicht den neuen Custom Player Header / LiveHUD. Sie wurden deshalb nicht als Basis verwendet.

## Uebernommen
- erweiterte Watchdog-DOM-Diagnosewerte
- Build/Version-Werte im Watchdog
- Netzwerkcheck gegen /health
- Recovery-History
- Central-Audio-Guard-Recovery-Zaehler
- HUD-Diagnose-Titles auf streamState/statusStream/statusSource

## Nicht uebernommen
- Rueckrolle auf aelteren index.html/player-core Stand
- Entfernung des Custom Player Headers
- Entfernung von Stream Config Manager / Ticker / Message Route Guard
- aktive Watchdog-Fallback-Recovery als zweiter Recovery-Controller

## Schutz
- Worker unchanged
- DarkDancer preserved
- Discord/Message/Shooter Backend unchanged
