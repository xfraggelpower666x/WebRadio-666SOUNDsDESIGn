# Reparatur- und Release-Änderungen

## Release

- **System:** WebRadio-666SOUNDsDESIGn
- **Version:** FULLVERSION REPAIRED v1.0.1
- **Datum:** 25. Juni 2026
- **Arbeitsprinzip:** erhalten, gezielt reparieren, additiv absichern

## Kritische Reparaturen

1. Fehlenden Skip-API-Handler als `worker-addons/skip-api-addon.js` wiederhergestellt und in `worker.js` importiert.
2. Chaos-Engine-Add-on in den aktiven Root-Dispatcher eingebunden.
3. `ASSETS`-Binding, Asset-Verzeichnis und Worker-first-Routing in `wrangler.jsonc` ergänzt.
4. `config/radio-runtime.json` als aktive Runtime-Quelle verbunden; optionales KV-Read-back ergänzt.
5. Render-Schreibroute `/api/player-alert/send` mit gemeinsamem Service-Token geschützt.
6. Player-Alert-Historie aus flüchtigem Prozessspeicher in SQLite/optional PostgreSQL überführt.
7. Unbekannte APIs und fehlende Dateien liefern korrekte 404-Antworten.
8. Debug-Endpunkte standardmäßig verborgen und nur kontrolliert freigebbar gemacht.

## Hohe und mittlere Reparaturen

- Netzwerk-Timeouts und bereinigte Fehlermeldungen ergänzt.
- Metadaten-Quell-URLs aus öffentlichen Antworten entfernt.
- Upload-Größe, Dateiendungen und FFmpeg-Laufzeit im Render-Service begrenzt.
- externe Chaos-/Suno-Worker mit begrenzter JSON-Annahme, Origin-Allowlist und Auth-Timeouts versehen.
- nicht implementierte externe Routen melden 501 statt falschen Erfolg.
- Suno-In-Memory-Jobs durch optionales KV und realen generischen REST-Provideradapter ersetzt.
- leere Audit-JSON transparent als Wiederherstellungsdatensatz repariert.
- innere ZIP-Datei entpackt und als reguläre Quelldateien integriert.
- Python-Bytecode und Cache-Verzeichnisse entfernt.
- `.gitignore`, `.assetsignore`, Release-Manifeste und Tests ergänzt.
- Root-README an den tatsächlich vorhandenen Repo-Aufbau angepasst.
- Scriptable-Uploader mit Repo-Root-Validierung und Ignore-Regeln gehärtet.

## Nicht still behauptete Grenzen

- Secrets und echte Zugangsdaten sind nicht im Paket enthalten.
- PostgreSQL-Persistenz ist nur aktiv, wenn `DATABASE_URL` gesetzt wird; andernfalls nutzt Render SQLite.
- Der Suno-Adapter benötigt einen realen, kompatiblen Providervertrag und dessen Umgebungsvariablen.
- Der Scriptable-Uploader löscht keine veralteten Remote-Dateien.
- Produktiv-Livefunktion hängt weiterhin von korrekt eingerichteten externen Diensten, DNS, Secrets, Bindings und Providerverträgen ab.
