# 666AUDIO LIGHT WAVE 0.1.2-R6

## Windows-Anwendung

Die portable Version startet mit `666AUDIO-LIGHT-WAVE.exe`. Nach einer Installation öffnet sich dieselbe Anwendung über den Startmenüeintrag **666AUDIO LIGHT WAVE**.

- **Wiedergabe** öffnet eine lokale Audiodatei oder das 666SOUNDsDESIGn-Live-Radio. Lautstärke und Stopp sind direkt im Studio. Lokale Dateien lassen sich pausieren.
- **Vorschau öffnen** startet das bewegliche GPU-Fenster. An der Titelleiste kann es auf den zweiten Monitor gezogen werden. Ohne Vorschaufenster bleibt die Wiedergabe im Studio sichtbar und ruhig.
- Im Bereich **GPU-Vorschau und Aufnahme** stehen 24 Looks zur Wahl. **Effekt** wechselt das Bild auch bei laufender Aufnahme. **Intensität** beeinflusst die Bildreaktion auf das Audiomaterial. Die Tonlautstärke regelst du unter **Wiedergabe**.
- **GPU-Größe** steuert Vorschau und Aufnahme. Zur Wahl stehen 640 × 360, 854 × 480, 1280 × 720, 1920 × 1080, 2560 × 1440, 3840 × 2160, 1080 × 1080 und 1080 × 1920. Die Größe des Fensters beeinflusst lediglich die Anzeige. Während der Aufnahme bleibt die GPU-Größe fest.
- **Video** wählt MP4 mit H.264/AAC oder WebM mit VP9/Opus. Die vier Qualitätsprofile reichen von Kompakt bis Maximum. **Aufnahme starten** öffnet die Zielauswahl, **Aufnahme beenden** finalisiert die Datei. Beide Formate nutzen nominal 30 fps. MP4 verwendet einen verfügbaren Hardware-Encoder oder libx264. WebM verwendet libvpx auf der CPU.
- **Vorschau-HUD** blendet Rendergröße, gemessene Vorschau-FPS und Aufnahmestatus im Fenster ein. Die Datei enthält die Renderfläche und den App-Ton, während das HUD ein Bedienelement der Vorschau ist.
- **Audio speichern** konvertiert eine vorhandene Datei. WAV bietet 16-, 24- und 32-Bit-PCM sowie 32-Bit-Float. FLAC bietet 16/24 Bit. MP3 bietet 128, 160, 192, 256 oder 320 kbit/s. MP3 unterstützt in der App Original, 32, 44,1 oder 48 kHz. Falls die Originalrate für diese MP3-Optionen ungeeignet ist, verwendet die App 48 kHz. Für WAV/FLAC ist auch 96 kHz auswählbar. Die Quelldatei bleibt erhalten.
- **Wiedergabe → Klassische Videoeffekte**, **Projekt-Playlist** und **OpenVR** öffnen ihre Dateidialoge und eigenen Wiedergabefenster. Für klassische Effekte eine WAV, die MP4-Clips und einen Ordner mit den drei bestehenden Keyframe-CSVs des Tracks auswählen. Projekt-Playlists verwenden die vorhandenen Titellisten und Unterordner nach Edition. OpenVR benötigt die zur Hardware passende SteamVR-/OpenVR-Runtime und zwei Bildordner. Das Studio zeichnet seine GPU-Vorschau auf. Die klassischen Wiedergabefenster haben derzeit keine eigene Studio-Aufnahme.

## Entwickler-Start und Windows-Build

Auf dem Windows-Buildrechner Python 3.12 x64 mit Tk installieren. Für Setup wird zusätzlich Inno Setup 6.3 oder höher benötigt (Standardpfad, PATH oder `LWT_ISCC` mit Pfad zu `ISCC.exe`). Die Batch verwaltet die lokalen Python-Abhängigkeiten und den PyInstaller auf dem Buildrechner.

| Auswahl in 666AUDIO_LIGHT_WAVE.bat | Ergebnis |
| --- | --- |
| R | Studio aus den Projektquellen starten |
| T | Projekt- und Runtime-Tests ausführen |
| D | Medien und Entwicklungsumgebung prüfen |
| P | `dist/666AUDIO-LIGHT-WAVE.exe` als einzelne portable EXE erzeugen und prüfen |
| S | Dieselbe EXE bauen und daraus `dist/666AUDIO-LIGHT-WAVE-Setup-x64.exe` erzeugen |
| I | Python-Projektabhängigkeiten installieren bzw. prüfen |

Die Build-Batch prüft den Kandidaten mit einem Starttest, bevor sie ihn nach `dist` kopiert. EXE und Setup werden ohne Batch, Python-Installation oder Entwicklerwerkzeuge an Anwender übergeben. Startprotokolle stehen unter `%LOCALAPPDATA%\LightWaveTech`.

## Änderungen in R6

- **3D-Formeditor:** Im Studio **3D-Formeditor** öffnen. Rechts der Drehachse eine Kontur über Kontrollpunkte bearbeiten oder **Freihand** wählen und ziehen. Das Studio erzeugt eine 3D-Rotationsfläche aus dem B-Spline. Änderungen gehen in die laufende Vorschau und Aufnahme. **Speichern** und **Öffnen** verwenden ein versioniertes JSON-Format. **3D · Facettenmaske** ist zusätzlich als trianguliertes, audioreaktives Relief im Effektmenü verfügbar.
- **FFT-Analyse:** Unter **Visualisierung → FFT-Analyse** die Länge und bei Bedarf adaptive Block-Normierung umstellen. Die Einstellung wirkt auf alle Studioeffekte, die Frequenzdaten nutzen.
- **LIFX-Farbbibliothek:** 378 Original-Theme-Einträge mit Suchdialog. Die Farben wirken auf alle vier virtuellen Lichtzonen. Alle Palettendaten liegen zusammen mit der Quelllizenz unter `DATA/integrations/lifx`. Netzwerk und Geräte sind dafür nicht erforderlich.
- **LightwaveExplorer:** Über **Visualisierung → LightwaveExplorer-Spektrum importieren** ein Ergebnis-ZIP mit einem passenden Paar aus `*_spectrum.dat` und `*.txt` wählen. Die App liest X, Y und Gesamtintensität des ersten Simulationslaufs, skaliert sie gemeinsam logarithmisch und zeigt sie in einer aufnehmbaren Szene. Der Import verwendet die dokumentierte little-endian-Double-Anordnung.
- **GlimHUD:** **Visualisierung → Vorschau-HUD-Design** lädt Farbgebung, Deckkraft, Rundung und Rahmen der fünf mitgelieferten Originaldesigns. Das HUD ist mit der Maus im Vorschaufenster verschiebbar und bleibt außerhalb der Aufnahme. Die Originalprofile und Lizenz liegen unter `DATA/integrations/glimhud`.

## Änderungen in R5

- **OpenGL Music Visualizer:** Die FFT-Balkenidee wurde als rotierender Spektrumring neu umgesetzt. Er nutzt die vorhandenen Frequenzbänder der Studio-Audioquelle.
- **OpenGL Face Music Visualizer:** Die facettierte Geometrie inspirierte die Neonmaske mit frequenzabhängiger Verformung und beleuchteten Kanten.
- **OpenGL Modeling Music Visualizer:** Die B-Spline-Idee wurde als drei fließende Wellenbänder umgesetzt. Die Frequenzwerte dienen als Stützpunkte.
- **GlimHUD:** Kompaktes, optionales HUD für gemessene Vorschau-FPS, Auflösung und REC. Für diese Studio-Funktionen werden eigene GLSL- und Python-Implementierungen verwendet.

## Änderungen in R4

Sieben neue Softwareeffekte laufen über dieselbe GPU-Vorschau und MP4-Aufnahme:

- **Lichtzonen:** Aurora, Farbkreis, Lauflicht und Puls animieren ein virtuelles Raster mit 24 × 12 Panels. Die Beschreibungen der Animationen in `lifx-async` 8.0.1 dienten als Referenz. Die Studio-Implementierung besteht aus GLSL.
- **Optik:** Interferenz zweier Wellenquellen, stilisierte Einzelspaltbeugung und spektrale Strahlaufspaltung. Die Feld- und Strahlansichten von LightwaveExplorer 2026.1.5 dienten als Referenz. Die Effekte sind Echtzeitvisualisierungen für Musik.

Dafür wird keine Lampensteuerung im Netzwerk benötigt. Beide neuen Gruppen reagieren auf die Studio-Audioanalyse sowie den Intensitätsregler.

## Änderungen in R3

Das Studio übernimmt zehn eigenständige Renderpässe aus dem vorhandenen Shader-Bestand. Spektrum bleibt die Standardansicht. Die Shader-Quellen und ihre eingebetteten Urhebervermerke befinden sich in `DATA/shaders/music_video/v2`. Die klassische Timeline nutzt weiterhin ihren eigenen Renderer.

## Änderungen in R2

Direkter Desktop-Einstieg, In-App-Auswahl für die klassischen Modi, beim Start generierter Mediencache für ausgewählte Ordner sowie Portable- und Setup-Build aus derselben Quelle. Die GPU-Vorschau, Radio-Wave-Gestaltung, MP4-Aufnahme und Audiokonvertierung stammen aus dem Studio-Update.

Original von [InfiniteQuantumZen / Sambodhi Padmasamadhi](https://github.com/InfiniteQuantumZen/light_wave_tech), siehe `LICENSE.txt` und `packaging/CREDITS.txt`.
