# REPORT v36.2.1 — REMOVE BAD CUSTOM HEADER

**Projekt:** WebRadio-666SOUNDsDESIGn  
**Version:** v36.2.1  
**Build:** v36.2.1-2026-06-05-remove-bad-custom-header  
**Basis:** v36.2 Split Booster PC/Mobile  
**Status:** PASS  
**Worker geändert:** Nein  
**DarkDancer:** erhalten  
**Split Booster:** erhalten  
**Canonical Layer Cleanup:** erhalten  
**Codex Layer Recovery:** erhalten  

## Grund

Die in v35.8/v36.x geschützte Custom-Header-Kopfzeile wurde vom Nutzer als verworfen bestätigt. Sie sah nicht passend aus und darf nicht länger als geschützter Bestandteil gelten.

## Entfernt

- `css/custom-player-header-livehud-v1.css`
- `js/custom-player-header-livehud-v1.js`
- `assets/logos/custom-header/cyber-header-user-source.png`
- `assets/logos/custom-header/cyber-header-user-transparent.png`
- `assets/logos/custom-header/cyber-header-user-trimmed.png`
- Custom Header DOM mit `data-custom-header-hud="1"`
- Custom Header CSS/JS Includes aus `index.html`

## Wiederhergestellt

Die Kopfzeile nutzt wieder:

```text
/assets/logos/phase10-new-header-logo.png
```

## Behalten

- v36.2 Split Booster PC/iPhone
- v36.1 Canonical Layer Cleanup
- v36.0 Codex Recovery
- Admin / Message / EQ / Watchdog
- DarkDancer
- Worker unverändert
