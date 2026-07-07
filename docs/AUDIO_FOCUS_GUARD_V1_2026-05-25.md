# AUDIO FOCUS GUARD V1 — 2026-05-25

## Zweck

Der Radio-Stream bleibt Master.

Broadcast-Nachrichten, Discord/Overlay-Sounds, kurze fremde Browser-Audios oder kurze iOS-Fokuswechsel dürfen den Player nicht sofort stoppen.

## Regeln

```text
- kein sofortiger Stop bei kurzer Unterbrechung
- 10 Sekunden Toleranzfenster
- wenn Audiosignal/Fokusproblem kurz war: Stream bleibt/kommt zurück
- wenn Nutzer bewusst Stop/Pause drückt: respektieren
- bei Telefonat/iOS-Langunterbrechung darf pausiert werden, danach Resume versuchen
```

## Umsetzung

```text
js/phase10-stability-iphone-panel-hud.js

installAudioFocusGuard()
recoverAudio()
visibilitychange/pageshow/pagehide
pause tolerance timer
streamWanted state
```

## Keine Layer-Stapelung

Kein neues Audio-System, kein zweiter Player, kein zweiter AudioContext.
Die Logik schützt den vorhandenen Audio-Player.
