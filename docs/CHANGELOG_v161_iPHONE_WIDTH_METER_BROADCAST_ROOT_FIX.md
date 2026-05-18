# v161 — iPHONE WIDTH + LEVELMETER + BROADCAST ROOT FIX

Created: 2026-05-18  
Modified: 2026-05-18

## Basis
v160 — iPHONE SEND + BOOST ROOT FIX

## Änderungen
- iPhone-Playerbreite wieder reduziert, damit linkes und rechtes Levelmeter vollständig im Viewport liegen.
- Seitliche Levelmeter links/rechts sichtbar nach innen gesichert.
- Reaktivität aller drei Meter gestärkt: links, rechts und unteres Center-Out-Levelmeter.
- Keine neue Meter-Canvas-Schicht, keine neue Audio-Engine, keine neue Boost-Engine.
- Interner Broadcasterposter unter SEND hart an denselben `/api/player-alert/send` Worker-Endpoint gebunden wie der PC-Sender.
- Doppelte alte Broadcast-Composer aus Addons werden auf Mobile entfernt, der bestehende v159/v160 Editor bleibt erhalten.
- PC-Geometrie nicht verändert.

## Root-Fix
Der Fix liegt bewusst am Ende der `index.html`, damit ältere v96/v105/v159/v160 Mobile-Overrides nicht erneut die iPhone-Geometrie überschreiben.
