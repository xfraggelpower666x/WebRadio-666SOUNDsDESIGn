# 666STREAM CodeForge — Radio-Govee-Logik extrahieren und auf offizielle Cloud-API portieren

STATUS=DESIGN_HANDOFF | SOURCE_REUSE_FIRST=TRUE | NO_LIVE_MUTATION
SCOPE=projects/666-GOVEE-CONTROL/
GOVEE_CONTROL_LOGIC_OWNER=CLOUDFLARE_WORKER
CLOUD_FIRST=TRUE
LOCAL_BRIDGE_REQUIRED=FALSE

## Konkreter Migrationsauftrag
Aus dem vorhandenen Radio-Govee-Code die vorhandene Mapping-/Steuerlogik als Ausgangspunkt lesen und **portieren statt neu erfinden**:
- js/system-extra/govee/govee-sync-config.js: pacing, gain/low/mid/high weights, sceneModeMap, FX theme color map, beatFlash/dropFlash.
- js/system-extra/govee/govee-scene-sync.js: inferSignalScene, readFxContext, mapAnalyzer, scene stabilization (1200 ms), scene events.
- js/system-extra/govee/govee-bridge-client.js: alten HTTP Bridge-Vertrag als Migrationsreferenz dokumentieren, nicht 1:1 an Govee Cloud senden.
- js/system-extra/govee/govee-fx-control-hooks.js: UI-Hooks als vertraglich kompatiblen dünnen Client planen.
- public/js/system-extra/govee/ Spiegel berücksichtigen.

## Zielarchitektur
Radio besitzt weiterhin Audio-Acquisition und echte Analyzer-Signale. Worker besitzt zentral Govee-Lichtlogik und offizielle Cloud-API-Ansteuerung mit zwei Capability-basierten Geräten (H6047 LightBars / H6198 TV), Einzelsteuerung, Gruppen-Dispatch und Szenen. Shared API für weitere Systeme, keine Cross-System-Merges.

## Unbedingt adaptieren
- Kein 90-ms-Govee-Cloud-Befehlsstrom; intelligente Drosselung, In-flight-Begrenzung, API-Quoten und Event-Aggregation.
- Eingaben serverseitig validieren; keine Original-Browser-Control-Tokens oder Govee-Keys in öffentlichem Radio JS.
- H6198 TV Sync respektieren; keine unbestätigten RGBIC-/DreamView-Capabilities behaupten.
- Einzel-/Gruppen-Overrides und Teilfehler unabhängig behandeln.
- Keine Python-/LAN-Bridge-Pflicht im Cloud-First-Modus; LAN nur optionale spätere Fast-Path-Erweiterung.
- 0 EUR Zusatzkosten als Deploy-Gate; kein Kostenversprechen jenseits der verfügbaren Free-Quoten.

## Ausführungsfolge
1. Source-Module und deren realen Besitzer prüfen; aktuelle Worker-Routen/Source abgleichen.
2. Pure Mapping-Funktionen und Tests in isolierter Govee-Projektstruktur erstellen.
3. Erst nach gesicherter Geräte-Capability-Abfrage Worker-Adapter zur Govee Cloud-API anschließen.
4. Einzel/Gruppe/Audiomodus via Auth und Testmatrix validieren.
5. Radio minimalinvasiv auf dünnen Client umstellen; Altpfad erst nach erfolgreichem Fresh-Host-Test außer Betrieb nehmen.
6. RADIO-CODEFORGE-Daemon, GitHub CI, Readback, Release Integrity; Current-Pointer nur bei autorisiertem Update zuletzt.

No APK source or binaries imported. No secrets. No foreign native updates. No production radio or Worker mutation in this handoff.
