# STABLE WATCHDOG MERGE V1 — 2026-06-04

## Basis

Stable-Build:
`WebRadio-666SOUNDsDESIGn_CENTRAL_AUDIO_STABILITY_GUARD_V2_2026-05-30.zip`

Codex-Quelle:
`WebRadio-666SOUNDsDESIGn_STREAM_WATCHDOG_V1_PATCH2_2026-06-04.zip`

## Merge-Regel

Aus Codex wurde **nicht** der komplette Player übernommen.

Übernommen wurde gezielt:

```text
js/stream-watchdog-v1.js
Watchdog-HUD-CSS
Watchdog-Startanbindung
Watchdog-Dokumentation
```

Nicht übernommen:

```text
kompletter Codex-Player-Umbau
unnötige neue Root-Umbauten
weitere Codex-Strukturänderungen
```

## Schutz

```text
Main bleibt Main
Backup bleibt manuell
Central Audio Stability Guard V2 bleibt erhalten
PRIVATE_TRACK_SHOOTER bleibt erhalten
iPhone Parity bleibt erhalten
Side Meter bleibt erhalten
Deploy-Route unverändert
```

Build:
`v2026.06.04-stable-watchdog-merge1`

Cache:
`stable-watchdog-merge1-20260604`
