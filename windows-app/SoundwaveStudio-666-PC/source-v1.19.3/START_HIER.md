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
