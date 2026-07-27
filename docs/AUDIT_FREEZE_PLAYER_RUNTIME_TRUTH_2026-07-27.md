# 666 Stream Player — Runtime Truth Audit / Freeze Gate

**Branch:** `audit-freeze/player-runtime-truth-20260727`  
**Datum:** 2026-07-27  
**Status:** `FREEZE_BLOCKED`

## Ziel

Aktive Produktionsrouten, tatsächliche HTML-/CSS-/JS-Besitzer, AudioContext-/Analyser-Instanzen und alle Writer für Equalizer, Levelmeter und Seitenpanels vollständig erfassen. Defekte werden ausschließlich im aktiven Besitzer repariert. Kein neuer Layer, kein zweiter Bus, kein zusätzlicher Visualizer-Timer.

## Verifizierte aktive Quellen

- Root-Worker: `worker.js`
- Browser-JavaScript: `js/`
- Hauptplayer: Root-`index.html` mit Spiegel `public/index.html`
- VELUNA: `veluna/index.html` mit eigener Inline-CSS-/JS-Struktur
- Hauptplayer-Core: `js/player-core.js`
- Kanonischer Visualizer: `js/equalizer.js`

## Verifizierter Hauptplayer-Konflikt

### Autorität A — Player Core

`js/player-core.js` bindet das Audioelement `#radio` und startet `startVisualizer()` aus `js/equalizer.js`.

### Autorität B — Inline-Mobile-Runtime

Root-`index.html` enthält zusätzlich:

- `getAudio()` mit Bevorzugung/Erzeugung von `#mffAudio`
- eigenen `audioGraph`
- eigene Analyser-/EQ-/Boost-Zustände
- eigene Play/Pause/Stop-Audiosteuerung

Damit besitzt der Hauptplayer weiterhin zwei Audio-/Graph-Autoritäten. Dieser Zustand ist nicht freeze-fähig.

## Verifizierte Deployment-Lücke

Die Cloudflare-Kommentare der letzten Reparatur-PRs belegen Branch-/Commit-Preview-Deployments. Ein eigener, belastbarer Nachweis für den anschließenden Production-Deploy des jeweiligen Merge-Commits auf der echten Player-Domain fehlte.

## Freeze-Gates

- [ ] Hauptplayer besitzt genau ein Audioelement und eine AudioGraph-Autorität
- [ ] Hauptplayer EQ/Side-/Bottom-Meter besitzen genau einen Writer
- [ ] VELUNA-PC und VELUNA-iPhone separat auditiert
- [ ] VELUNA-Levelmeter folgt echtem Audiosignal
- [ ] Volume/Boost/EQ wirken proportional und mit Headroom
- [ ] Keine autonome CSS-/Sinus-/Timer-Bewegung
- [ ] Root-/public-Spiegel bytegleich
- [ ] Vollständige bestehende Tests grün
- [ ] Production-Deploy des finalen Merge-Commits belegt
- [ ] Sichtbarer Gerätetest durch Benutzer bestätigt

## Verbindlicher Reparaturablauf

1. Aktiven Besitzer identifizieren.
2. Defekt dort minimalinvasiv reparieren.
3. Konkurrierende Verantwortung entfernen, nicht deaktivierend überlagern.
4. Re-Audit und vollständige Tests.
5. Production-Deploy des finalen Merge-Commits verifizieren.
6. Gerätetest bestätigen.
7. Erst danach Freeze, Hashes und Systemsicherung.

## Aktueller Freeze-Entscheid

`BLOCKIERT`

Grund: konkurrierende Hauptplayer-Audioarchitekturen und nicht vollständig belegte Production-Auslieferung der bisherigen Merge-Commits.
