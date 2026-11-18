# 666STREAM · RADIO WAVE 1.19.3 · visuelle Ausstattung R01

- Quellbasis: GitHub, `xfraggelpower666x/WebRadio-666SOUNDsDESIGn`, Branch `WebRadio-666SOUNDsDESIGn`, HEAD `bdf417044f7191304f5aaeabfd07ec49596f86ce`. Der native Windows-Quellstand im Current Pointer ist `d21bc7a274fd8b1c252deede2c92bc36980d5f3e`.
- Teilprojekt und Zielpfad: `WINDOWS_APP`, `windows-app/SoundwaveStudio-666-PC/source-v1.19.3/`.
- `src/appearance.js` lädt und validiert die Motivauswahl, aktualisiert die Vorschau und zeichnet auf dem bestehenden Canvas. Die Auswahl ist quellenübergreifend. Der Standardstart eines neuen Profils bleibt Sternenfeld. In Hochformat und Ultrawide bleiben Standardmotive vollständig sichtbar. Eigene Dateien behalten das bestehende Verhalten im Hauptfenster.
- `src/index.html`, `src/style.css`, `src/workspace.js` und `main.js` verbinden Branding und Hintergrund mit der vorhandenen Oberfläche und dem ablösbaren Fenstersystem. Die Logo-Ansicht zeigt bestehende Grafiken, das PayPal-Motiv ist eine Grafik im Dialog.
- `src/app.js` verwendet die Hintergrundauswahl als Canvas-Schicht vor Visualizer, VJ und Text-Overlay. Kein neuer Audiopfad.
- `tests/appearance.test.cjs` prüft Zuordnung, Speicherung, Motivgeometrie, Ladefehler, überholte Ladevorgänge und die Weitergabe der Auswahl an die Visualizer-Ausgabe.

| Bild | Einbindung | Datei unter `src/assets/radio-wave/visuals/` |
| --- | --- | --- |
| 1 | Kopfleiste | `666soundsdesign.png` |
| 2 | Rundes Support-Motiv im Branding-Dialog | `fraggel-paypal-badge.png` |
| 3 | Hintergrund LYVRA Music Discovery | `lyvra-music-discovery.png` |
| 4 | FRAGGELPOWER666-Banner im Branding-Dialog | `fraggelpower666-banner.png` |
| 5 | PayPal.me-Banner im Branding-Dialog | `paypal-banner.png` |
| 6 | LYVRA-Logo im Branding-Dialog | `lyvra-soundlogo.png` |
| 7 | Hintergrund LYVRA Portal | `lyvra-portal.png` |
| 8 | Hintergrund LYVRA Resonance Awakens | `lyvra-resonance.png` |
| 9 | Hintergrund RADIO WAVE v6.66 | `radio-wave-v666.png` |

Offen für die Abnahme unter Windows ist die Darstellung in der gepackten App.
Dazu `RADIO_WAVE.bat` starten, Menüpunkt 1 wählen, im Fenster-Dock **BACKGROUND**
öffnen, alle vier Motive durchschalten, auf einen zweiten Monitor ausgeben und
nach Neustart die Auswahl prüfen. Das Kopflogo anklicken und die Logos bei
schmalem und maximiertem App-Fenster ansehen.

Status der Quellprüfung: vier gezielte Node-Regressionstests und 168 gezielte
Release-Prüfungen bestanden. Drei Electron-Audiotests der breiten Suite waren
in der Prüfumgebung durch die fehlende Electron-Laufzeit blockiert. Reale
Fensterdarstellung, Monitorwechsel und Installer bleiben Windows-Abnahme.
