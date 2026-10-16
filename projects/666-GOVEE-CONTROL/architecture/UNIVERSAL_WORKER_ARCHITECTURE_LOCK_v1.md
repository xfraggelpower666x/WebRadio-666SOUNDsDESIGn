# 666 GOVEE CONTROL — Universal Worker Architecture Lock v1
Datum: 2026-10-17 | STATUS=DESIGN_LOCKED | IMPLEMENTATION=OPEN

## Verbindlicher Architekturauftrag an 666STREAM RADIO-CODEFORGE
GOVEE_CONTROL_LOGIC_OWNER=CLOUDFLARE_WORKER
NATIVE_RADIO_CONTROL_LOGIC=THIN_CLIENT_ONLY
AUDIO_SIGNAL_OWNER=SOURCE_APPLICATION
NO_CROSS_SYSTEM_MERGE=TRUE
FREE_TIER_ONLY=TRUE
SECRETS_NEVER_IN_FRONTEND=TRUE

### Universeller Kern
Der bestehende separate Cloudflare Worker `666-govee-control` bildet die wiederverwendbare Steuereinheit, nicht eine zweite Radio-Runtime. In ihm liegen zentral: Gerätemodell-/Capability-Erkennung, zulässige Befehle, Power/Farbe/Helligkeit, Szenenlogik, Gruppen-Durchlauf, Device-State/Fehler, Ratenbegrenzung, Authentifizierung, Audit und Audio-Event→Lichtprogramm-Mapping.

### Zwei isolierte Gerätebereiche
1. **LIGHTBARS / H6047**: Gerät `192.168.2.32` für optionale lokale LAN-Steuerung; im Worker offiziell unterstützte Cloud-API-Capabilities. Kein Worker→private LAN-IP/UDP direkt; schnelle Effekte benötigen weiterhin optionalen lokalen Transportadapter.
2. **TV / H6198**: Gerät `192.168.2.33` als lokale Geräteinformation; Govee Cloud-Capabilities über sicheren Worker; TV-/DreamView-Modus bewahren und vor ggf. störenden manuellen Farbwechseln kenntlich machen.

Beide Bereiche teilen API und Governance, **nicht** pauschal dieselben Fähigkeiten. Getrennte Adapter, Zustände, Profile, Fehler und Capability-Auswahl.

### Universelle Gruppensteuerung
Einzelsteuerung der H6047 und H6198 unabhängig; Gruppen sind definierte Gerätemengen und können flexibel kombiniert werden. Gruppenbefehle werden je Gerät nach dessen echten Fähigkeiten abgewickelt. Ergebnis pro Mitglied ausweisen; keine atomare Gleichzeitigkeit oder hundertprozentige Sync versprechen. Gruppenänderung darf eigenständige Einzelkonfigurationen nicht still überschreiben.

### Audio-/Szenenarchitektur
Quellsystem (WebRadio/Soundwave/LIGHT ORCHESTRA/LYVRA, nur bei explizitem eigenem Integrationsauftrag) analysiert echtes Audio lokal und sendet autorisierte, gedrosselte Events (Beat/Drop/Szene/Bass-Mid-High-Aggregate). Worker besitzt die Steuerlogik, Szene-Farb-Mapping, Gruppen-Dispatch und Geräteschutz. Kein Cloud-Audioframe-Streaming mit 90-ms-Takt; Govee-Rate-Limits berücksichtigen. Hochfrequentes LAN-Licht braucht einen optionalen lokalen, eigenständigen Client/Adapter; reine Cloudflare Workers können kein LAN-UDP ans Heimgerät senden.

### Wiederverwendbare Einbindung
Versionierter Vertrag `/api/v1/devices`, `/api/v1/control`, `/api/v1/groups`, `/api/v1/groups/control`, `/api/v1/audio/events` ist *DESIGNVORSCHLAG*, nicht im vorhandenen Worker bereits implementiert. Jede native Anwendung behält ihre Identität, Autorität und Audioquelle. Kein fremder Autostart.
Öffentliche HTML-Webradios dürfen keine Worker Bearer-Secrets erhalten; geschütztes Admin-UI oder geeignete serverseitige User-Session erforderlich. Keine ungeschützten CORS-Steuerpfade.

### Bestehende Realität
Der existierende Worker `666-govee-control` bietet derzeit `/health`, `/api/devices`, `/api/state`, `/api/control`. `GOVEE_API_KEY` und `CONTROL_TOKEN` sind als Cloudflare-Secrets konfiguriert; Werte niemals in GitHub.
Radio: `js/system-extra/govee/` verwendet bisher lokale HTTP-Bridge unter `localhost:3000`; vorhandene Audioanalyse, Player/FX, Root/Public-Spiegel und native Deploy-Ownership bewahren. Umstellung erfolgt minimalinvasiv erst nach sicheren End-to-End-Tests.

### CodeForge Gates
1. Live-Capabilities mit sicherem Admin-Readback prüfen (keine öffentlichen Diagnosetüren).
2. Worker-API zuerst isoliert implementieren und testen; Gruppen und Geräteadapter strikt trennen.
3. Versionierten dünnen Client herstellen, niemals Secrets in Radio-Code.
4. Hochfrequente LAN-Alternative separat optional vorsehen.
5. Regressionen: Einzel/Gruppe, Capability-Allowlist, TV-Sync, Fehlermeldungen, Rate-Limits, Audioevents, Security, Free-Tier, Root/Public-Mirror.
6. Eigene GitHub RADIO-CODEFORGE CI und Readback, danach optional geplante Anwendungseinbindung. Kein unbestätigter Live-PASS.

## Ausgeschlossene Imports
Govee Home APK/XAPK, extrahierte Binärdateien und App-Code nicht in Repository übernehmen. Nur bereits zuvor dokumentierte Erkenntnisse als Kontext, keine Implementierung aus extrahiertem proprietärem Code.

## Änderungsgrenzen dieses Locks
Nur neues Dokument in `projects/666-GOVEE-CONTROL/`; keine Änderungen an radio-codeforge-Vertrag, 666STREAM Current-Pointern, produktiven Radio-Dateien, laufendem Cloudflare Worker oder anderer nativer Authority.
