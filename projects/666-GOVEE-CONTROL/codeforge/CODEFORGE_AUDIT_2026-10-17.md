# 666 RADIO-CODEFORGE — Govee-Projekt: Arbeitsdurchlauf 01
Datum 2026-10-17 | Status: SOURCE_AUDIT_VERIFIED / IMPLEMENTATION_PENDING / NO_PRODUCTION_PROMOTION

## Bindung und Scope
Aktives projektlokales Ziel: `projects/666-GOVEE-CONTROL/`.
Checkpoints: `projects/666-GOVEE-CONTROL/checkpoints/2026-10-17-initial/PROJECT_CHECKPOINT.md`.
Host-Vertrag gelesen: `radio-codeforge/README.md` und `radio-codeforge/radio-codeforge.config.json`.
CodeForge ist die 666STREAM-native Entwicklungshilfe, kein fremdes System und kein Runtime-Prozess.
No-foreign-activation; kein LIGHT_ORCHESTRA/PFS/Fremdprojekt-Write.

## Evidenz: Ursachenanalyse (GitHub Source Read)
1. `js/system-extra/govee/govee-sync-config.js`: lokaler HTTP-Bridge-Endpunkt `http://localhost:3000`; Request-Takt 90 ms (~11,1/s maximal bei idealer Verarbeitung).
2. `js/system-extra/govee/govee-bridge-client.js`: die erwarteten POST-Routen sind `/api/enabled`, `/api/mode`, `/api/audio`, `/api/test/on`, `/api/test/off`, `/api/test/color`.
3. `js/system-extra/govee/govee-scene-sync.js`: vorhandener `analyzer:update`-Verbraucher, Mapping von Bass/Mid/High/Energy/Kick/Drop, Scene-Stabilisierung und MeterBus-Pump. `connected=true` bedeutet erfolgreiche HTTP-Antwort, NICHT bestätigten Lampenzustand.
4. `js/system-extra/govee/govee-fx-control-hooks.js`: besitzt Controls für enable/mode/test-color und baut Fallback-Calls auf Bridge-Client.
5. `docs/GOVEE_INTEGRATION.md`: dokumentiert die ältere H6047-IP `192.168.2.110`, während Nutzers Screenshot `192.168.2.32` zeigt. Veraltete Dokumentation ist nicht automatisch produktiver Fehler.
6. Für die getestete lokale App wurden in dieser Repo-Prüfung keine funktional identischen Bridge-Routen nachgewiesen.
7. `public/js/system-extra/govee/` enthält Spiegeldateien; Root/Public-Parität muss bei späterer Radioänderung geprüft werden.
8. Browser-basierter Zugriff vom öffentlich gehosteten Radio auf `localhost:3000` benötigt laufende Bridge und Browser-Netzwerkfreigaben. Es ist noch nicht nachgewiesen, welcher dieser Faktoren den historischen Laufzeitfehler verursachte.

## Hauptbefund und Korrekturrichtung
ROOT_CAUSE_CANDIDATE: Ein nicht vorhandener / nicht kompatibler lokaler HTTP-Bridge-Dienst und/oder blockierter Browser-Zugriff erklärt das offline-Verhalten. SOURCE-EVIDENCE ist stark; reproduzierter Live-Fehler fehlt. Keine blinde Änderung auf Port 8766.
Das neue Cloudflare-Worker-Protokoll (/api/devices, /api/control, /api/state) ist bewusst NICHT deckungsgleich mit den sechs alten Bridge-Routen.
Befehle an die Govee-Cloud können durch Provider-Ratenlimits/Latenz nicht mit 90-ms-Audioframes gleichgesetzt werden.
Der Worker darf keine Auth-Tokens in öffentlichen Radio-JS-Dateien erhalten.

## CodeForge-Entscheidungen für v0.2
- Live-Govee-Capabilities von H6047 und H6198 read-only sicher ermitteln, bevor Geräteszenen, Segment-RGBIC oder Music-Modus behauptet werden.
- Worker-Transport als separat autorisierte Control-Plane designen: Einzelsteuerung, Capability-Whitelisting, Gruppen-Dispatch, per-device Fehlerbericht, Zeit-/Rate-Limits.
- Audioreaktivität: lokale Radio-Audioanalyse bleibt am Audio-Owner. Worker nimmt nur stark gedrosselte, authentisierte Szenen-/Mode-Ereignisse entgegen. Fast-Beat-/Frame-Effekte nur über optionale lokale LAN-Steuerung.
- Individuelle Geräte-Overrides im Gruppenmodus erhalten; Cloud-API keine atomare Synchronität garantieren.
- TV-DreamView-Sync nicht unangekündigt durch Farbkommandos beenden.
- Separate Govee-App und Worker bleiben eigenständige Oberflächen; Radio bleibt als Client optional.

## Testplan / Gates
1. Geheimnisschutz: `GOVEE_API_KEY` und `CONTROL_TOKEN` ausschließlich Secret-Bindings; keine Public-CORS-Freigabe für private Admin-Routen; Auth-Fehler 401; fehlende Secrets 503.
2. Read-only Geräteliste: echte Provider-Antwort inklusive Capability-Schema; kein Schreiben an Lampen.
3. Eingabe-/Eigentumskontrolle: sku+device aus Provider-Liste; Capability-Instanz und Datentypen streng validieren; URL/Body-Limits.
4. Einzelsteuerung: Power/Farbe/Helligkeit pro Gerät; Feedback aus API nicht mit physischem Ist-Zustand verwechseln.
5. Gruppensteuerung: nur ausgewählte Geräte, deduplizierte IDs, per-device Resultate, Fehlerisolierung und Schutz gegen API-Ratelimits.
6. Audiologik: keine Audioframe-Flood über Worker; Kontroll-Event-Drossel, In-Flight-Gate, Resume/Stop-Verhalten, keine simulierten Audiopegel.
7. Radio-Mirror-Regression: Root und Public spiegelbildlich, Player, Metadaten, EQ, FX und Stream unangetastet.
8. GitHub Workflow `radio-codeforge-force.yml` und Release Integrity: separate Prüfung nach Implementierung, vor Promotion.

## Aufgabenstatus
- [x] Autorität, Scope und CodeForge Host-Kontrakt gelesen.
- [x] Konkrete Schnittstellen und Root-Cause-Kandidaten geprüft.
- [x] Root/Public-Risiko und Regression-Gates dokumentiert.
- [ ] Tatsächlicher Geräte-Capability-Readback via sicherer Worker-Diagnose.
- [ ] Gesicherter Worker-v0.2-Implementierungsschritt mit Tests.
- [ ] Adapter/Group-Endpoint in isoliertem Govee-Projekt.
- [ ] Vollständiger Import der früheren ZIP-Quellen (APK ausdrücklich ausgeschlossen).
- [ ] Unabhängige CI- und Cloudflare-Host-Validierung.
Keine produktive Radio-, Govee-Cloud- oder Lampenmutation in diesem Lauf.

## Ausführungswahrheit
SOURCE_AUDIT=PASS
DEVICE_API_READBACK=OFFEN
LIVE_CONTROL_TEST=OFFEN
GITHUB_FORCE_DAEMON=READBACK_PENDING
CLOUDFLARE_HOST_TEST=OFFEN
PRODUCTION_PROMOTION=NO
