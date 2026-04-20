<!-- ==========================================
DATEI: README.md
ERSTELLT: 2026-04-16
GEÄNDERT: 2026-04-16
ZWECK: Zentrale Master-README für das 666SOUNDsDESIGn WebRadio-Repo.
ÄNDERUNG: Root auf eine Haupt-README reduziert und Detaildokumente in docs/ gebündelt.
========================================== -->

# 666SOUNDsDESIGn WebRadio

## Überblick
Dieses Repo enthält den **Cloudflare-Worker**, den **externen Haupt-Player**, den **internen Worker-Fallback-Player**, die **Recovery-Stände** und das **Scriptable-Upload-Skript**.

## Aktueller Funktionsstand
- **Externer Player = Standard**
- **Interner Worker-Player = Notfall-Fallback**
- **Domain bleibt über Worker/Proxy sichtbar**
- **UI ist als One-Page-Cyber-Layout ausgelegt**
- **Metadaten werden nur gelesen/angezeigt**
- **Worker-/API-/Metadata-Endpunkte wurden für den UI-Build nicht erweitert**

## Repo-Struktur
- `worker.js` → aktiver Root-Worker
- `workers/webradio-666soundsdesign-worker/worker.js` → aktiver gespiegelter Worker für Deploy-Zwang
- `external-player/` → externer Haupt-Player
- `assets/`, `css/`, `js/`, `config/` → interner Worker-Fallback-Player
- `recovery/` → Last-Known-Good + Snapshots
- `Scriptable/Scripts/` → iPhone-Uploadskript
- `docs/` → Detaildokumentation / Patch-Historie / Recovery-Hinweise

## Wichtige Regeln
- **ADD-ONLY / EXTEND-FIRST**
- **Keine eigenmächtigen Code-Kürzungen**
- **Root-Worker und `workers/.../worker.js` müssen identisch bleiben**
- **Nur komplette Vollversionen als ZIP ausliefern**
- **Kritische Strukturänderungen nur nach Freigabe**

## Detaildokumente
- `docs/player.md`
- `docs/scriptable.md`
- `docs/recovery.md`
- `docs/patch-history.md`

## Hinweis zur Konfiguration
- `wrangler.toml` wird **nicht** genutzt.
- Maßgeblich ist `wrangler.jsonc` bzw. im Worker-Unterordner `wrangler.jsonc`.


## Minimal Root Player Build (2026-04-20)

Neu ergänzt:
- `index.html` als externer Hauptplayer im Repo-Root
- `css/extern.css`
- `js/extern.js`

Wichtig:
- Worker bleibt im Root
- Interner Fallback-Player bleibt technisch unverändert
- Externer Player nutzt nur relative Pfade: `/stream`, `/fallback-stream`, `/api/nowplaying`
- `/extern` liefert denselben externen Root-Player unter derselben Domain aus
