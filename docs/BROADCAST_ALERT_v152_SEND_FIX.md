# BROADCAST ALERT v152 SEND FIX

## Problem

Die sichtbare v152-HTML nutzt:

```text
playerAlertPcText
playerAlertPcSend
```

Das eingebundene Broadcast-JS hat aber noch auf alte IDs gehört:

```text
pcBroadcastInput
pcBroadcastSendBtn
```

Dadurch wurde der sichtbare SEND-Button nicht an den echten Send-Handler gebunden.

## Fix

- JS bindet jetzt zuerst auf `playerAlertPcText` / `playerAlertPcSend`.
- Legacy IDs bleiben als Fallback erhalten.
- Payload sendet `clientId` und `senderId`.
- Worker akzeptiert `clientId` oder `senderId`.
- Worker gibt beide Felder zurück.
- Eigene Nachricht wird weiterhin nicht lokal zurückgespielt.
- PC Inline Box wurde ohne neue Zeile leicht verschoben:
  - `right: 118px`
  - Textfeld `220px`
  - Status-Span inline nach SEND

## Nicht geändert

- Kein Player-Wrapper.
- Keine neue Zeile.
- Kein Audio-Code.
- Kein Notfallplayer.
- Kein Root-Umbau.
