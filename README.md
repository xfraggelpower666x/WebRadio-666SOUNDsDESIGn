# 666SOUNDsDESIGn WebRadio – FULLVERSION REPAIRED v1.0.1

**Release:** 25. Juni 2026  
**Status:** reparierte Repo-Vollversion  
**Upload-Ziel:** GitHub-Repository / Cloudflare-Worker-Deploy  
**Mobile Route:** Scriptable auf iPhone oder iPad

## Direktaufbau nach dem Entpacken

Das Release-ZIP besitzt genau **eine oberste Projektmappe**:

```text
WebRadio-666SOUNDsDESIGn_FULLVERSION_REPAIRED_v1_0_1/
├── worker.js
├── wrangler.jsonc
├── index.html
├── package.json
├── .assetsignore
├── 666SOUNDsDESIGn/
├── CHAOS_ENGINE/
├── assets/
├── config/
├── core/
├── css/
├── dashboard/
├── docs/
├── external-workers/
├── js/
├── Render/
├── renderer-resources/
├── Scriptable/
├── worker-addons/
└── ...weitere vollständige Repo-Bestandteile
```

Beim Entpacken auf dem iPhone entsteht diese eine Mappe. **Diese Mappe selbst** wird im Scriptable-Uploader ausgewählt. Darin liegen die Repo-Root-Dateien unmittelbar; es gibt keinen zweiten Wrapper und kein verschachteltes Release-ZIP.

## Mobile GitHub-Übertragung

1. ZIP in der iOS-Dateien-App entpacken.
2. Scriptable öffnen.
3. `Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js` in Scriptable übernehmen.
4. In `SETTINGS` GitHub-Token, Owner, Repository und Branch hinterlegen.
5. `UPLOAD FOLDER (LIVE)` starten.
6. **`WebRadio-666SOUNDsDESIGn_FULLVERSION_REPAIRED_v1_0_1` auswählen.**

Der Uploader validiert die Repo-Root vor dem ersten Upload und überspringt Gerätemüll, Build-Caches und verschachtelte Archive. Details: `SCRIPTABLE_UPLOAD_README.md`.

## Aktive Hauptsysteme

- Root-Cloudflare-Worker mit statischen Player-Assets
- WebRadio-Player, Dashboard, Konfiguration und Worker-Add-ons
- geschützte Radio-Admin-Konfiguration mit optionalem KV-Read-back
- Player-Alert-Weiterleitung zum Render-Service
- Render-Alert-/Audio-Service mit Schreibauthentifizierung und Datenbankablage
- separater Chaos-AI-Worker
- separater Suno-Adapter-Worker
- Scriptable-GitHub-Ordner-Uploader
- Release-Prüfung und Worker-Smoke-Tests

## Reparaturkern

- fehlenden `handleSkipApi` wiederhergestellt
- Chaos-API in den Root-Dispatcher eingebunden
- Cloudflare-`ASSETS`-Binding und Asset-Routing ergänzt
- aktive Radio-Runtime-Konfiguration mit Worker verbunden
- echte JSON-404/405-Antworten statt HTML-Fehlfallback
- öffentliche Debug-Ausgaben standardmäßig gesperrt
- Player-Alert-Schreibweg zwischen Worker und Render authentifiziert
- Render-Historie persistent über SQLite bzw. optional PostgreSQL
- externe Worker von Wildcard-CORS und False-Success-Platzhaltern bereinigt
- automatisierte Syntax-, Struktur- und Smoke-Prüfung ergänzt

Vollständige Änderungen: `docs/REPAIR_CHANGELOG_FULLVERSION_v1_0_1_2026-06-25.md`.

## Vor dem Produktiv-Deploy erforderlich

Secrets werden bewusst **nicht** mitgeliefert. Mindestens die passenden Cloudflare-/Render-Secrets müssen im jeweiligen Dienst gesetzt werden. Referenzen:

- `.dev.vars.example`
- `wrangler.secrets.required.example.jsonc`
- `docs/CLOUDFLARE_BINDINGS_AND_SECRETS_v1_0_1.md`
- `Render/666SOUNDsDESIGn-Alert-Service-Renderer/.env.example`

Für sofortige Radio-Konfigurationsaktivierung wird optional ein KV-Binding `RADIO_CONFIG_KV` verwendet. Ohne dieses Binding bleibt der GitHub-Commit-Weg erhalten; die neue Konfiguration wird nach dem nächsten erfolgreichen Deploy aktiv.

## Lokale Prüfung

```bash
npm run verify
```

Die Prüfung kontrolliert Pflichtdateien, JSON-Gültigkeit, verbotene innere ZIPs/PYC-Dateien, Renderer-Spiegelkonsistenz und Root-Worker-Smoke-Tests.
