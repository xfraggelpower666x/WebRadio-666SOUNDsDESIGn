# 666 GOVEE CONTROL — Initialer 666STREAM-Projektspeicherpunkt
Datum: 2026-10-17 (Deutschland) | Status: CHECKPOINT / PARTIAL / NO LIVE PROMOTION

## Scope und Autorität
- Eigenständiger 666STREAM-Projektbereich (Dokumentation/Continuity); kein fremder nativer Runtime-Start.
- 666STREAM-Repository: `xfraggelpower666x/WebRadio-666SOUNDsDESIGn`, Dokumentationszielbranch: `WebRadio-666SOUNDsDESIGn`.
- Current-Struktur gelesen: `666STREAM_STRUCTURE_CONTROL/current/CURRENT_STATE.md`; Project Continuity Index und Pre-Rehydration Scope Guard gelesen. Diese bleiben unverändert. HEAD allein bestimmt keinen Projekt-Foreground.
- Kein Merge in LIGHT_ORCHESTRA, WEBRADIO, LYVRA oder SOUNDWAVE; kein Update ihrer Current-Pointer; PFS bleibt Backup-Zuständigkeit, keine Fremdwrites.
- In diesem Checkpoint werden keine Gerätekommandos gesendet, keine Secrets gespeichert und keine externen Worker geändert.

## Geräte — vom Nutzer über App-Screenshots bereitgestellt
| Name | SKU | IP (lokal) | Firmware | LAN |
|---|---|---|---|---|
| Govee-LightBars | H6047 | 192.168.2.32 | 1.00.12 | In Govee Home aktiviert |
| Govee-TV / DreamView | H6198 | 192.168.2.33 | 1.10.05 | Option in App nicht sichtbar |
- H6047-MAC aus Screenshot: 60:74:F4:40:D9:A2.
- MAC H6198 war nicht vollständig belastbar transkribiert, deshalb kein Wert gespeichert.
- Aktuelle IPs sind Netzwerkkonfiguration, kein garantierter dauerhafter DHCP-Lease.
- Nutzer berichtete, dass die H6047-Grundfunktionen über die vorher gelieferte Test-App tatsächlich verstellbar waren (User-observed PASS, nicht unabhängig durch den Connector getestet).
- H6198 über Govee Cloud API vorgesehen; konkrete Geräteliste/Capabilities noch nicht mit der API gelesen.

## Entwicklungsziel
Zwei getrennte kleine Apps, unabhängig startbar:
1. H6047 LightBars: vorhandene funktionierende lokale LAN-Bedienung erhalten; Python-Alternative als portable Windows-EXE/integrierte Node-Bridge vorgeschlagen (NO BUILD CONFIRMED). Für browserseitiges UDP ist ein lokaler Transportprozess erforderlich.
2. H6198 TV: Cloud-API-gestützte Bedienung, nur tatsächlich freigegebene Geräte-Capabilities verwenden.
Optional gemeinsame zentrale 666 GOVEE CONTROL Worker-Steuerung mit Einzel-, Gruppen- und Musikprogrammen. Kein kostenpflichtiger Dienst. Cloudflare Free-Tier / Govee-Limits beachten.
- Einzelsteuerung pro Gerät: Power, Helligkeit, Farbe und erlaubte Szenen.
- Gruppensteuerung: flexible Gruppen, Auswahl pro Gerät; Gruppenkommandos intern pro Gerät und Capability; eigene Gerätezustände erhalten, keine garantierte atomare Gleichzeitigkeit.
- Gerätemodi: Individual, Group, Music; Zuordnung zur Audioreaktivität pro Gerät.
- DreamView/TV-Sync nicht unbeabsichtigt überschreiben; Mode-Switches und unterstützte Features live prüfen.
- Govee-Cloud-API hat Latenz/Rate-Limits; keine sichere schnelle Beat-frame-Synchronisation. Für H6047 schnelle Effekte lokale LAN-Brücke erhalten.
- Audioanalyse aus vorhandenem Radio beibehalten (Bass/Mid/High, Beats/Drops). Worker kann Lichtmapping, Szenen und Befehle verwalten, nicht automatisch das live-Audiosignal hören.
- Öffentliches Radio darf keine Govee-Secrets oder CONTROL_TOKEN im Client ausliefern. Authentisierte Admin-Grenze erforderlich.

## Cloudflare-Worker — durch Connector geprüft
- Cloudflare-Konto (Anzeigename): 666SOUNDsDESIGn.
- Separater Worker: `666-govee-control` (als eigenständiger Worker angelegt, ohne Änderungen an `webradio-666soundsdesign-worker`).
- Erstes erfolgreiches Worker-Upload: 2026-10-16T23:12:45.398163Z, Cloudflare deployment id `a33263acd7d34a0dace5cdf7681f42ac`; spätere Deployment-Liste enthält einen Eintrag 2026-10-16T23:16:27.920629Z. Keine Behauptung über volle Live-Befehlstests.
- Connector-Secret-Readback am 2026-10-16/17: `GOVEE_API_KEY` und `CONTROL_TOKEN` beide als secret_text vorhanden; KEINE Werte auslesen/persistieren.
- Vorhandene API-Routen im Worker: `GET /health`, `GET /api/devices`, `POST /api/state`, `POST /api/control`. Geräte-Erkennung verlangt auth und den Key. `/api/groups/*` noch NICHT implementiert. Zugriffsschutz: Bearer CONTROL_TOKEN.
- Bislang keine erfolgreich abgeschlossene Geräte-Capability-Abfrage. Grund: Cloudflare-Connector gibt Secret-Werte nicht aus; für sicheren serverseitigen Diagnoselauf ist geeigneter autorisierter Pfad nötig. Kein Umgehen von Zugriffsschutz durch ungeschützte öffentliche Diagnose-Endpunkte.
- Keine Govee-API-Anfrage an konkrete H6047/H6198 live verifiziert. Worker initial implementiert, aber Request-/Capability-Schema gegen tatsächlich gelieferte Antworten noch zu validieren.
- Keine Weitergabe von Secrets an GitHub, HTML, ZIP, Logs oder Chat. API-Key-Nutzung nur gemäß genehmigten kostenlosen Govee-Bedingungen.

## Bestehende 666STREAM-Radio-Dateien, bei GitHub gelesen (nicht geändert)
- `js/system-extra/govee/govee-sync-config.js`
  - `baseUrl: "http://localhost:3000"`; `sendIntervalMs:90`, `requestTimeoutMs:1800`, `reconnectDelayMs:5000`.
  - Szenen-Mapping `idle→ambient`, `build→cyber`, `break→ambient`, `drop→club`, `storm→club`.
  - Gewichtung bass 1.15/mid 0.95/high 1.0 und Beat-/Drop-Flags.
- `js/system-extra/govee/govee-bridge-client.js`
  - HTTP POST `/api/enabled`, `/api/mode`, `/api/audio`, `/api/test/on`, `/api/test/off`, `/api/test/color`; andere Endpoints als die kleine Test-App / Cloud-Worker.
- `js/system-extra/govee/govee-scene-sync.js`, `js/system-extra/govee/govee-fx-control-hooks.js` und `public/js/system-extra/govee/` Spiegelvarianten vorhanden.
- `docs/GOVEE_INTEGRATION.md` dokumentiert ältere Geräte-IP `192.168.2.110`, H6047 und Bridge localhost:3000. Alte dokumentierte IP nicht automatisch produktive Runtime-IP.
- `docs/README_GOVEE_FX_SCENE_SYNC_ADDON.md`; `docs/GOVEE_FX_SCENE_SYNC_INTEGRATION_V1_2026-05-25.md`.
- Die vorhandene Radio-Bridge-Server-Implementierung wurde bei Suche nicht nachgewiesen. SOURCE FOUND != LIVE TEST. Ältere Browser→localhost-Architektur kann an fehlender Bridge, HTTPS/localhost-CORS/PNA und Endpoint-Kontrakt scheitern; genaue Ursache bleibt unbestätigt.
- Radio-Audio-Analyse, FX-Engine und Player behalten; kein Überschreiben von `config/stream-config.js`, `js/workers/cors-proxy-worker.js`, `js/core/shared-audio-engine.js`, `js/core/shared-analyzer.js`, `js/ui/sticky-player.js`.

## Bisherige Artefakt-/Import-Referenzen aus Chat (ohne APK)
- `GOVEE_LOCAL_CONTROL_v1.zip` (lokales HTML + Python-LAN-Backend + Windows-Starter; H6047-Grundfunktionen vom Nutzer beobachtet).
- `GOVEE_HYBRID_CONTROL_v1.1.zip` (LAN-H6047 erhalten; H6198 Cloud-Discovery vorbereitet, kein bestätigter Live-API-Betrieb).
- `666-GOVEE-WORKER-v1.zip` (Worker-Quellpaket, möglicherweise nicht byte-identisch zum direkt via Cloudflare Connector bereitgestellten Worker; Release-Abgleich erforderlich).
- README_DE.md, CHANGELOG.md, index.html der früheren gelieferten Pakete als Referenzen; Dateipfade aus der Chat-Artefaktlieferung, NICHT als auf GitHub bereits importiert behauptet.
- Verifikation/Import dieser Paket-Binaries in GitHub in diesem Checkpoint **nicht erfolgt**; nur Referenzen und Entscheidungen dokumentiert. Keine erfundenen Datei-Hashes.

## APP-Referenzumfang und Ausschluss
- Der Nutzer stellte eine Govee-Home-XAPK zur Funktionsreferenz bereit. **Die APK/XAPK und alle daraus extrahierten Dateien, Binärdaten, Assets, Decompiled Code und Paketbestandteile werden ausdrücklich NICHT in die Repo übernommen.**
- Frühere App-Analyse behauptete Indikatoren für DreamView, Szenen, Musikmodi, RGBIC, DIY/Segments/Groups. Diese sind als orientierende Befunde notiert, nicht als autorisierte oder nachgewiesen verfügbare Cloud-API-Capabilities.

## Nächste Schritte / Gates
1. Neuen Checkpoint read-back prüfen, keine Current-Pointer verändern.
2. Gegen Cloudflare Live-Worker Quell-/Route-Readback und Package v1 abgleichen; keine stillen Ersetzungen.
3. Sicheres Diagnosedesign mit vollständiger Admin-Authentifizierung vor dem ersten echten `GET /api/devices`; keine Schlüssel-Exposition.
4. H6047/H6198 tatsächliche Capabilities pro Gerät feststellen; IDs nur aus vertrauenswürdiger Live-Antwort.
5. Einzelsteuerung und begrenzte Gruppensteuerung als neue Worker-Version, atomare Speicherung/KV nur falls benötigt und kostenlos; explizite Sicherung + Readback.
6. Radio-Client separat patchen nach Scope-Prüfung; vorhandene Audioanalyse und FX unangetastet, testbare Adapter-Schnittstelle.
7. Getrennte LAN-Mini-App ohne Python (EXE) entwickeln, wenn gewünscht; Govee-Cloud für langsame Befehle, LAN für schnelle Effekte.

## Status- und Sicherheitsregeln
VERIFIZIERT: Repository-Dateien gelesen; Worker existiert; Secret-NAMEN vorhanden.
USER-OBSERVED: H6047-LightBars ließen sich durch Test-App steuern.
ABGELEITET: Radio-Bridge-Kontrakt stimmt nicht mit Test-App überein; vermutete Fehlerursache, nicht live reproduziert.
OFFEN: Geräte-Capabilities, Gruppen-Endpunkte, Win-EXE, Cloud-API-Steuerung, echte Audiosynchronisierung.
WRITE: Nur dieser neue 666STREAM-Speicherpunkt. Keine Fremdwrites, keine Secrets, keine APK.
