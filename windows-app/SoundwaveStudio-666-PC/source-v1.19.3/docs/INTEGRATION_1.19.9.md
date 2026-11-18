# RADIO WAVE 1.19.9 · Audit, Reparatur und Integration

## Quellbasis

Windows-App aus 666STREAM, Branch `WebRadio-666SOUNDsDESIGn`, Basiskommit
`c494fe7d1b28459a57565b4c072bbba48d4487ab`. Die zwölf Originalgrafiken stammen
aus Visuals R02 einschließlich des enthaltenen R01. ASUS REST folgt dem
Ablauf im GOVEE-/ASUS-Handoff. Die 8766-Anbindung folgt dem tatsächlichen
`GET /api/devices`- und `POST /api/control`-Vertrag der Local/Hybrid-Pakete.

## Änderungen und Bedienung

- Der Renderer verwaltet Visualizer-Standardmotive und bereits gespeicherte
  eigene Bilder in derselben Canvas-Schicht. Die Standardmotive werden
  eingepasst. Eigene Bilder behalten Cover, Skalierung und Starfield-Reset.
  Der Hauptfenster-Hintergrund hat einen eigenen Speicherwert und gehört
  zur App-Oberfläche. Der Branding-Dialog verwendet die Originalbilder.
- Port 3000 verlangt eine positive JSON-Quittung. HTTP 200 mit HTML oder
  unvollständigem JSON erzeugt einen Fehler. Port 8766 lädt pro Freigabe
  eine Geräteliste, versendet nur an ein gewähltes Ziel und kennzeichnet
  UDP-Senden als unbestätigte Gerätewirkung. Analyzer-Farbwechsel für 8766
  werden zeitlich begrenzt und identische Farben unterdrückt.
- ASUS Aura REST unterstützt die im Handoff genannten Notebooktastatur-Typen.
  Farbe und Bassreaktion gelten jeweils für die gewählte Tastatur als Ganzes.
  Die native Freigabe ist an die GOV-Sitzung gebunden. Bei unklarem Besitz
  meldet der Adapter den Zustand und überlässt die Prüfung Armoury Crate.
  OpenRGB bleibt als zusätzlicher Weg erhalten.

## Nachprüfung

- 10/10 gezielte Visuals- und Lichtadaptertests. Die Beleuchtungstests prüfen
  die lokale Schnittstelle mit kontrollierten Antworten.
- Gesamtsuite mit System-FFmpeg: 179 von 183 bestanden. Drei Electron-Tests
  sind durch fehlende lokale Electron-Runtime blockiert. Eine Prüfung zur
  gebündelten Windows-Cyber-Studio-EXE blieb übersprungen. H.264/AAC-Konvertierung
  und Dekodierung liefen mit echtem FFmpeg.
- 102/102 Syntax, 116/116 statische Integration, 168/168 Release-Prüfungen,
  7/7 separate MilkDrop-Control-Prüfungen.

## Offen und Rückweg

Die Cloud-Route aus dem Handoff braucht eine separate Integration des
WebRadio-Workers und seines Bindings. Dieses Paket enthält die Windows-App und
spricht die lokalen Dienste an. Windows-Start, Setup, Portable, der zweite
Monitor und Lichtwirkung an echter Hardware stehen zur Abnahme aus. Der
GitHub-Stand bildet den Rückweg. Für den Einbau dieses ZIP bitte getrennt
entpacken und über `RADIO_WAVE.bat` starten.
