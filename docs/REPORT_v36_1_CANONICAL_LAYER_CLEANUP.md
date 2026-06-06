# REPORT v36.1 — CANONICAL LAYER CLEANUP

**Projekt:** WebRadio-666SOUNDsDESIGn  
**Version:** v36.1.0  
**Build:** v36.1.0-2026-06-05-canonical-layer-cleanup  
**Basis:** v36.0 TASK9B Layer Recovery Codex Features  
**Status:** PASS  
**Worker geändert:** Nein  
**DarkDancer:** geschützt / erhalten  
**Custom Header:** geschützt / erhalten  

## Ziel

Keine neuen Features. Keine neue Optik. Kein neuer Layer über dem Chaos.

v36.1 stoppt den gefährlichsten Altmechanismus: Der mobile `killOldDom()`-Block hat bisher nützliche DOM-Strukturen physisch aus dem Dokument entfernt. Das konnte Codex-Features wie Admin-Hub, iPhone-EQ-Tap, Message/Emoji, Header-HUD oder spätere Overlays unsichtbar oder unwiederbringlich machen.

## Geändert

- `index.html`
  - `killOldDom()` entschärft
  - physisches `remove()` durch kanonisches Archivieren ersetzt
  - geschützte Player-/Codex-Module werden nicht mehr gelöscht
- `css/phase10-stability-iphone-panel-hud.css`
  - v36.1 Schutzregeln für aktive Player-Systeme
  - pointer-events für EQ/Sound/Admin/Message/Header-HUD abgesichert
- Version/Cache-Burst aktualisiert

## Geschützte Systeme

- `#s666ParityMobileHub`
- `#s666SoundControlOverlay`
- `#mffAlertEditorBackdrop`
- `#fpAdminOverlay` / `#fp-admin-overlay`
- `#playerAlertPcBox`
- `#pcHeaderBrandSplit`
- `#pcHeaderNewLogo`
- `#pcHeaderHudTitle`
- `#eqBars`
- `#mffEqBars`
- `#pcRealEqPanel`
- `#nowPlayingTicker`
- Transport-Buttons
- Discord-Gate-Overlays
- Layer-Recovery-Elemente

## Nicht geändert

- `worker.js`
- `worker-addons/`
- Discord Backend
- Message Backend
- Stream-Routen
- DarkDancer
- Cloudflare-Secrets

## Risiko-Hinweis

Historische CSS-/Inline-Layer existieren weiterhin. v36.1 ist die erste gezielte Stabilisierung gegen destruktive DOM-Löschung. Eine vollständige Auslagerung/Entflechtung der 26 Inline-Style-Blöcke und 11 Inline-Script-Blöcke bleibt ein separater größerer Strukturblock.
