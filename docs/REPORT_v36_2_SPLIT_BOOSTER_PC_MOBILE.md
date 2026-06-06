# REPORT v36.2 — SPLIT BOOSTER PC / iPHONE

**Projekt:** WebRadio-666SOUNDsDESIGn  
**Version:** v36.2.0  
**Build:** v36.2.0-2026-06-05-split-booster-pc-mobile  
**Basis:** v36.1 Canonical Layer Cleanup  
**Status:** PASS  
**Worker geändert:** Nein  
**DarkDancer:** geschützt / erhalten  
**Custom Header:** geschützt / erhalten  

## Ziel

PC und iPhone bekommen getrennte Booster-Profile.

## Warum

PC mit großen Boxen braucht keine aggressiven 5 Boost-Stufen. Dort bleibt der Klang sauberer mit Flat + minimalem Boost.  
iPhone/Kopfhörer brauchen weiterhin mehrere Stufen, weil Kopfhörer und Handylautsprecher unterschiedlich reagieren.

## Neue Boost-Profile

### PC

```text
PC FLAT = Stage 0 / Gain 1.00
PC MINI = Stage 1 / Gain 1.12
```

PC wird hart auf Stufe 0–1 begrenzt.

### iPhone / Mobile

```text
BST 0 = Gain 1.00
BST 1 = Gain 1.40
BST 2 = Gain 1.70
BST 3 = Gain 1.90
BST 4 = Gain 2.08
BST 5 = Gain 2.20
```

Mobile bleibt bei 0–5.

## Technisch geändert

- `core/audio/boost-core.js`
  - Profile `pc` und `mobile`
  - getrennte localStorage Keys
  - Runtime-Erkennung PC/Mobile
  - `clampStage(value, profile)`
  - `getGain(value, profile)`
  - `publish(..., profile)`
- `js/player-core.js`
  - nutzt aktuelles Boost-Profil
  - PC-Buttons clampen auf 0–1
- `js/equalizer.js`
  - Gain/Stage über Profil
- `js/sound-control-overlay-v1.js`
  - zeigt Profil an
  - Range-Max passt sich an PC/Mobile an
- `index.html`
  - Inline-Mobile-Boost nutzt Profil-Max
- Version/Cache-Burst aktualisiert

## Nicht geändert

- `worker.js`
- `worker-addons/`
- Discord Backend
- Message Backend
- Stream-Routen
- DarkDancer
- Custom Header
- Cloudflare-Secrets
