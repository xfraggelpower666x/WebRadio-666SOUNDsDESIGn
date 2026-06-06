# REPORT v36.3 — METADATA / COVER / VIEWPORT STABILITY REPAIR

**Projekt:** WebRadio-666SOUNDsDESIGn  
**Version:** v36.3.0  
**Build:** v36.3.0-2026-06-05-metadata-cover-viewport-stability  
**Basis:** v36.2.1 Remove Bad Custom Header / Keep Split Booster  
**Status:** PASS  
**Worker geändert:** Nein  
**DarkDancer:** erhalten  
**Bad Custom Header:** bleibt entfernt  
**Split Booster PC/iPhone:** erhalten  

## Grund

Vor dem nächsten UI-Umbau mussten zwei harte Fehler repariert werden:

1. Metadaten-/Cover-Art hängt, flackert oder zeigt altes Stream-Bild.
2. Player läuft auf iPhone/PC unten aus dem sichtbaren Bereich.

## Repariert

### Cover-Art / Stream-Bild

- Desktop-Cover `#nowCover` wird nicht mehr sofort ersetzt.
- Neues Cover wird erst vorgeladen und dann sichtbar getauscht.
- Kein sofortiges Zurückfallen auf Fallback-Cover bei einem einzelnen leeren Metadata-Poll.
- Fallback-Cover wird erst nach wiederholtem No-Cover-Zustand gesetzt.
- Mehr verschachtelte Artwork-Felder werden geprüft.

### iPhone-Cover im Mobile Player

- `.mff-symbol` nutzt dieselbe Stabilitätslogik.
- Altes Bild wird nicht mehr entfernt, bevor das neue Bild geladen ist.
- Kein leeres Symbol-Flackern während Metadata-Updates.

### Viewport / sichtbarer Bereich

- Neuer CSS-Stabilitätsblock `css/viewport-stability-v1.css`.
- Mobile `#mffApp` wird auf `100dvh` begrenzt.
- Player-Shell nutzt `justify-content: space-between` und reduzierte dynamische Höhen.
- PC-Shell wird gegen Überlauf nach unten begrenzt.

## Nicht geändert

- `worker.js`
- `worker-addons/`
- Discord Backend
- Message Backend
- Stream-Routen
- DarkDancer
- schlechter Custom Header bleibt entfernt

## Geänderte Dateien

- `index.html`
- `js/player-core.js`
- `css/viewport-stability-v1.css`
- `config/player-version.json`
- `config/player-version.js`
- `core/version/version-core.js`
- `js/version-state-guard-v1.js`
- `package-manifest.full-integration.json`
