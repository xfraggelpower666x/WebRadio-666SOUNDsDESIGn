# AMARIS Responsive-, Ticker- und Metadaten-Reparatur v1.2.3

## Zielzustand

Der AMARIS-Endpunkt bleibt ein eigenständiger Minimalplayer. Alle anderen Player bleiben bestehen. Auf iPhone nutzt AMARIS den sichtbaren Bildschirm vollständig, ohne Seiten-Scrollen. Auf PC erscheint derselbe Funktionsumfang als kleine Karte auf schwarzem Hintergrund.

## Routing

Folgende Adressen liefern denselben AMARIS-Miniplayer:

- `/amaris`
- `/amaris/`
- `/AMARIS`
- `/AMARIS/`
- `/amaris/index.html`
- `/AMARIS/index.html`

Physische Groß-/Kleinschreibungs-Spiegel befinden sich zusätzlich im Root- und `public/`-Bereich. Damit bleibt der Endpunkt auch bei statischer Asset-Auflösung vom Hauptplayer getrennt.

## Mobile Layout

```text
Viewport: 390 x 844
Document client/scroll: 390/390 x 844/844
Body client/scroll:     390/390 x 844/844
Player Card:            x=4, y=4, w=382, h=836
Overflow X/Y:           hidden / hidden
Footer:                 vollständig, einzeilig, innerhalb der Karte
```

Die Prüfung bestätigt keinen horizontalen oder vertikalen Dokumentüberlauf.

## Desktop Layout

```text
Viewport: 1440 x 900
Document client/scroll: 1440/1440 x 900/900
Player Card:            x=460, y=217.3, w=520, h=465.4
Hintergrund:            rgb(0, 0, 0)
```

Die Karte ist horizontal und vertikal zentriert und bleibt bewusst kompakt.

## Titel-Normalisierung

### Beispiel aus dem bereitgestellten iPhone-Screenshot

Eingang:

```text
666SOUNDSDESIGN - FRAGGELPOWER666 - - Ghost Inside The Line_1
```

Normalisierte Ausgabe:

```text
666SOUNDsDESIGn - FRAGGELPOWER666 - Ghost Inside The Line_1
```

Es wird kein weiterer Fraggle-/666SOUNDsDESIGn-Prefix angefügt, weil diese Identitäten bereits vorhanden sind.

### Nackter Tracktitel

Eingang:

```text
Ghost Inside The Line_1
```

Ausgabe:

```text
LYVRA is alive · 666SOUNDsDESIGn · Ghost Inside The Line_1
```

### Zentral bereitgestellte Worker-Felder

- `raw_title`
- `display_title`
- `normalized_title`
- `dj`
- `dj_display`
- `dj_mode`

Alle aktualisierten Frontends bevorzugen `display_title` beziehungsweise `normalized_title`, statt eigene widersprüchliche Prefixe zu erzeugen.

## DJ-Umschaltung

```text
Kein Live-DJ / Auto-DJ / Legacy-DJ-Name -> LYVRA DJ
Echter Live-DJ-Metadatenwert             -> echter Live-DJ-Name
```

Der Live-DJ-Name wird nicht überschrieben, solange er nicht als Auto-/Leer-/Legacy-Wert klassifiziert wird.

## Stream- und Source-Verhalten

AMARIS verwendet weiterhin zuerst:

1. `/stream`
2. `/fallback-stream`
3. direkte Main-Reserve
4. direkte Backup-Reserve

Die Source-Farbe beschreibt den aktuell vom Miniplayer gewählten Pfad. Die konkrete interne Upstream-Umschaltung innerhalb des Workers bleibt dessen Aufgabe.

## iOS-Audio-Start

- Audio wird ausschließlich nach Nutzerinteraktion gestartet.
- Das Startfenster schließt erst nach erfolgreichem `audio.play()`.
- Bei Fehlschlag bleibt die Bedienung erhalten und bietet `ERNEUT VERSUCHEN`.
- Die nächste Worker-/Fallback-Stufe wird vorbereitet.

## Nicht destruktive Abgrenzung

Die Reparatur ersetzt keinen bestehenden Player und verändert keine EQ-/Boost-/Hauptaudio-Verkabelung. Die zentralen Änderungen betreffen:

- AMARIS-Layout
- AMARIS-Ticker
- sichtbare Source-Zustände
- Worker-Metadaten-Normalisierung
- systemweite Anzeige von Titel und DJ-Status
