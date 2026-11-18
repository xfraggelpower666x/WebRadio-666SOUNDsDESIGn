# RADIO WAVE v6.66

Das ZIP vollständig entpacken und `RADIO_WAVE.bat` im Projektordner doppelklicken.

Vor dem Menü prüft die Batch Node.js, npm, PowerShell, die npm-Abhängigkeiten
und die Electron-Runtime. Fehlendes Node.js/npm und PowerShell installiert sie
über WinGet. Bei einer von WinGet erkannten Node.js-Installation prüft sie
automatisch auf Updates. Andere Installationsarten werden gemeldet, aber nicht
durch ein fremdes Paket ersetzt, solange Node.js mindestens Version 22.12 hat.

Fehlende oder abweichende Projektabhängigkeiten werden mit npm gemäß
`package-lock.json` installiert; die Lockfile-Versionen werden nicht ungeprüft
auf neuere Major-Versionen angehoben. Electron wird zusätzlich mit `--version`
geprüft und bei Bedarf automatisch repariert. Danach laufen die Quelltests
und beide Release-Prüfungen.

Für Installationen und Reparaturen ist Internetzugang erforderlich. WinGet
(Windows App Installer) muss für die Installation fehlender Systemwerkzeuge
verfügbar sein; andernfalls zeigt die Batch einen Fehler. Ohne WinGet kann eine
bereits vorhandene Node.js-Installation nicht automatisch aktualisiert werden.
Je nach Windows-Konfiguration können Systeminstallationen eine Bestätigung oder
Administratorrechte erfordern. Fehler werden angezeigt und beenden die Aktion.

| Taste | Aktion |
|---|---|
| 1 | Player starten |
| 2 | Windows-Installer und portable EXE in `dist` bauen |
| 3 | Portables ZIP in `dist/SoundwaveStudio-portable-win-x64.zip` bauen (Startdatei im Ordner `win-unpacked`) |
| 4 | Ende |

Nach jeder Aktion kehrt das Menü zurück. Direktaufrufe wie
`RADIO_WAVE.bat installer /nopause` durchlaufen ebenfalls die Startprüfung
und geben den Exitcode zurück. `RADIO_WAVE.bat check /nopause` führt nur
die Startprüfung aus.

Die Electron-Reparatur lädt das zur Lockfile-Version passende Windows-x64-Archiv,
prüft SHA-256 und die ausführbare Datei und ersetzt die Runtime erst nach
erfolgreicher Prüfung. Sie verwendet `tar.exe` oder PowerShell zum Entpacken.

Der gebaute Installer `dist/RADIO-WAVE-v6.66-Setup.exe` und die portable
`dist/RADIO-WAVE-v6.66-Portable.exe` enthalten Electron und die App. Auf dem
Ziel-PC müssen Node.js, npm und die Build-Werkzeuge nicht installiert sein.
Für die Erstellung der Dateien auf dem Entwicklungs-PC gelten die obigen
Voraussetzungen.

Die drei optionalen Skripte für Python und Windows-Diagnose liegen unter
`tools/windows`. Die B-01–B-03-Korrekturen sind Bestandteil dieses Pakets.

## GOV · lokale Lichtsteuerung

1. Lokalen Govee-Bridge-Dienst auf demselben PC starten. Der Player verwendet den vorhandenen Endpunkt auf localhost, Port 3000. LAN Control muss für das Gerät aktiviert sein.
2. Im Player auf GOV klicken und das Radio-Admin-Passwort eingeben. Die Freigabe gilt fünf Minuten und endet beim Schließen des Dialogs.
3. Licht an/aus, Testfarbe samt Helligkeit oder Audio-Reaktivität auswählen. Die Audio-Reaktivität liest das Spektrum des vorhandenen Soundwave-Players während der Wiedergabe.
4. ASUS Aura: Unter GOV → ASUS Aura die installierte OpenRGB.exe wählen, den lokalen SDK-Server in OpenRGB auf Port 6742 starten und den erkannten ASUS-Controller auswählen. Für diese Anbindung stehen feste Farbe und Schwarz zur Verfügung.

Eine Quittung im Dialog bestätigt die Antwort der lokalen Bridge. Die Reaktion der Leuchten lässt sich am Gerät prüfen.

## Bedienoberfläche 1.19.4

- **LOCAL → MEDIA LIBRARY** bündelt die Warteschlange, Datei- und Ordnerauswahl, den gespeicherten Audio-Pool, erneute Scans, einen Ordnerfilter und die Playlist-Verwaltung.
- **Audio FX** enthält neun EQ-Bänder mit Live-Pegel, sieben feste und fünf eigene Speicherplätze. Die Hardware-Einstellungen stehen darunter.
- **Wave Design** enthält die Position und Größe der Welle sowie den gemeinsamen Hintergrund mit Bildauswahl, Größenregler und Starfield-Rücksetzung. **Presentation & Output** bündelt Engine-Auswahl und Ausgabedisplays, Cyber Studio ist in **MilkDrop Studio**.
- **VJ Studio** zeichnet während der Wiedergabe drei Frequenzhüllkurven für CSV-Dateien auf. Die Paritätsauswahl lässt sich als wieder importierbares JSON speichern.
- **Export Studio** öffnet den Dateidialog beim auslösenden Exportfenster und holt beim Start der Aufnahme das Fortschrittsfenster nach vorn.
- **GOV** steht im Hauptfenster beim Player. Die Admin-Freigabe verlangt das Radio-Admin-Passwort. OpenRGB und die Govee-Bridge laufen bei Verwendung als lokale Anwendungen bzw. Dienste.

## Videoexport 1.19.6

1. In LOCAL eine Audiodatei laden oder eine spielbare Radio-/SoundCloud-Quelle wählen.
2. **Export Studio → Export Music Video** öffnet bei Bedarf die Dateiauswahl. MP4 ist vorausgewählt. Electron zeichnet bei verfügbarem WebM zunächst intern auf und FFmpeg erzeugt daraus MP4 mit H.264 und AAC. WebM kann weiterhin direkt gewählt werden.
3. Bei einer lokalen Datei endet der Mitschnitt am Dateiende. Bei einem laufenden Stream beendet **Stop & Save Video** die Aufnahme.
4. Beim Stoppen zeigt **Encoding MP4** die Konvertierung. Erst nach erfolgreicher Konvertierung erscheint der gespeicherte Zielpfad.
5. Der Status meldet eine fehlende Audioquelle, einen Encoderfehler oder den tatsächlich gespeicherten Pfad.

Die Startdatei prüft FFmpeg automatisch. Das Windows-Paket bündelt den Encoder über `ffmpeg-static@5.3.0`. Herkunft und Lizenz stehen in den mitgelieferten Materialien des [FFmpeg-Binärpakets](https://github.com/eugeneware/ffmpeg-static/tree/b6.1.1).

## YouTube

Im **Source Hub → YOUTUBE** eine Video- oder Playlist-Adresse eingeben. **Open YouTube Player** öffnet den offiziellen YouTube-Player in einem eigenen Fenster. Bei leerem Feld öffnet sich die YouTube-Startseite. **Open in Browser** nutzt den Standardbrowser, etwa für ein bestehendes YouTube-Konto. Ton und Video aus diesem Fenster liegen außerhalb des RADIO-WAVE-Visualizers und MP4-Exports.

## Direkte Audio- und Videolinks · 1.19.8

Im **Source Hub → MEDIA LINK** einen direkten Link zu MP3, WAV, MP4 oder WebM
einfügen und **PLAY LINK** drücken. Bei Adressen wie `www.example.com/video.mp4`
wird automatisch HTTPS ergänzt. Der Medienplayer zeigt bei Video das Bild und
bietet Wiedergabe, Pause, Lautstärke und, sofern vom Server unterstützt, Spulen.
**STOP & UNLOAD** beendet die Wiedergabe und entlädt die Datei.

Beim Wechsel zu LOCAL, Radio, SoundCloud oder YouTube pausiert der Link-Player.
Der Link-Player nutzt die Medienwiedergabe von Electron direkt. Visualizer, Audio
FX und Export Studio verwenden weiterhin den Hauptplayer. Der Link muss auf eine
abspielbare Datei zeigen. Die Abrufbarkeit hängt vom Server und vom Codec ab.
