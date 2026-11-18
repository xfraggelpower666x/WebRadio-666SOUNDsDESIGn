# 666STREAM · RADIO WAVE 1.19.3 · App-Hintergrund R02

- Teilprojekt `WINDOWS_APP`, Quellpfad `windows-app/SoundwaveStudio-666-PC/source-v1.19.3/`.
- GitHub-Basis `bdf417044f7191304f5aaeabfd07ec49596f86ce` auf `WebRadio-666SOUNDsDESIGn`. R02 baut lokal auf Visuals R01 `666f47f25e30e5956fd68c201d3b4b3ddf8878eb` auf.
- Die obere Leiste in `src/index.html` bietet vier Einstellungen einschließlich des bisherigen Standarddesigns. `src/app-background.js` speichert sie unter `rw666-app-background-v1`. Die Motive werden in `src/style.css` auf den Body des Hauptfensters gelegt. `src/workspace.js` vermeidet eine zweite Speicherung derselben Einstellung.
- Lokale Originale unter `src/assets/radio-wave/app-backgrounds/`: Cyber Temple (Lautsprecher und Om-Symbol), Neon Grid (dunkle Bühne), 666 Broadcaster (Cyborg und Schrift). Die vorhandene R01-Visualizer-Auswahl behält ihren eigenen Speicherwert und Renderer. Der Videoexport liest wie bisher den Visualizer-Canvas.
- Belegt sind fünf Node-Regressionstests sowie die gezielte Release-Prüfung. Die Original-JPGs wurden beim ZIP-Readback bytegenau geprüft.
- Nächster Schritt auf Windows: `RADIO_WAVE.bat` starten, Menüpunkt 1 wählen, in der oberen Leiste jedes App-Motiv wählen und den Visualizer verschieben oder verkleinern. Danach unabhängig ein Visualizer-Motiv wählen. App neu starten und beide gespeicherten Einstellungen, die Lesbarkeit und die separate Visualizer-Ausgabe prüfen.
