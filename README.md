# 666SOUNDsDESIGn WebRadio – FULLVERSION BRANCH RECOVERY v1.0.2

**Release:** 25. Juni 2026  
**Status:** deployfähige Vollversion mit Branch-Recovery und atomarem Scriptable-Upload  
**Repo:** `xfraggelpower666x/WebRadio-666SOUNDsDESIGn`  
**Produktivbranch:** `WebRadio-666SOUNDsDESIGn`

## iPhone-ZIP-Struktur

Beim Entpacken entsteht genau eine Mappe:

```text
WebRadio-666SOUNDsDESIGn_FULLVERSION_BRANCH_RECOVERY_v1_0_2/
├── worker.js
├── wrangler.jsonc
├── package.json
├── index.html
├── public/                         # einziger produktiver Cloudflare-Assetordner
├── worker-addons/
├── workers/
│   └── webradio-666soundsdesign-worker/  # Legacy-Build-Root-Kompatibilität
├── Scriptable/
└── ... vollständige Quell-, Backend-, Dokumentations- und Systembereiche
```

Diese Projektmappe selbst wird in Scriptable ausgewählt. Es gibt keinen zweiten Wrapper und kein verschachteltes ZIP.

## Warum v1.0.1 nach dem Branch-Neuaufbau nicht zuverlässig deployte

- Ein manueller GitHub-Browser-Upload kann versteckte Dateien wie `.assetsignore` und `.github/` auslassen.
- Der alte Scriptable-Uploader erzeugte pro Datei einen eigenen Commit. Dadurch konnte Cloudflare während des Uploads hunderte unvollständige Zwischenstände bauen.
- Cloudflare kann weiterhin einen alten Build-Root oder einen anderen Production branch gespeichert haben.
- `assets.directory: "./"` war unnötig von einer versteckten Ignore-Datei abhängig.

## Reparatur v1.0.2

- `public/` ist der einzige produktive Assetordner; Hidden-Dateien sind nicht mehr deploykritisch.
- `workers/webradio-666soundsdesign-worker/` unterstützt alte Cloudflare-Root-Einstellungen.
- Scriptable v5 lädt zuerst alle Git-Blobs hoch und aktualisiert den Branch danach genau einmal.
- Hidden-Dateien werden durch Scriptable vollständig übertragen.
- Root- und Legacy-Deploy verwenden denselben Worker-Namen `webradio-666soundsdesign-worker`.
- Ein sichtbarer Cloudflare-Recovery-Leitfaden liegt unter `CLOUDFLARE_DEPLOY_RECOVERY.md`.

## Scriptable-Upload

1. ZIP in der Dateien-App entpacken.
2. `Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js` in Scriptable übernehmen.
3. SETTINGS: Owner `xfraggelpower666x`, Repo `WebRadio-666SOUNDsDESIGn`, Branch `WebRadio-666SOUNDsDESIGn`.
4. `ATOMIC FULLVERSION – EXTRAS ERHALTEN` wählen.
5. Die Mappe `WebRadio-666SOUNDsDESIGn_FULLVERSION_BRANCH_RECOVERY_v1_0_2` auswählen.
6. Erst der abschließende einzelne Commit löst den Cloudflare-Build aus.

## Cloudflare-Pflichteinstellungen

Siehe `CLOUDFLARE_DEPLOY_RECOVERY.md`. Der Repo-Upload kann Cloudflare-Dashboard-Einstellungen und Secrets nicht automatisch ersetzen.

## Lokale Prüfung

```bash
npm ci
npm run verify
npm run deploy
```


## Release v1.2.2 — AMARIS hard route, iOS start and LYVRA DJ

- `/amaris`, `/AMARIS` and both `index.html` aliases are hard-routed to one standalone Mini-Player.
- Physical lowercase `amaris/index.html` mirrors prevent static hosting from falling back to the normal main player.
- Audio starts worker-first through `/stream`; `/fallback-stream` and runtime-configured direct sources remain recovery stages.
- The iPhone start overlay closes only after confirmed playback and re-enables retry after failure.
- Auto-DJ is displayed canonically as `LYVRA DJ`; real live-DJ metadata overrides it automatically.
- Main player and `/internal` emergency player remain separate and preserved.

## Release v1.2.5 — Responsive AMARIS, zentraler Ticker und systemweite DJ-Normalisierung

- AMARIS nutzt auf iPhone/iOS exakt `100dvh` mit Safe-Area-Unterstützung und gesperrtem horizontalem sowie vertikalem Seiten-Overflow.
- Auf Desktop/PC steht AMARIS als kompakte, zentrierte 520-px-Miniplayer-Karte auf schwarzem Hintergrund.
- Now Playing ist auf AMARIS als echte, duplizierte Endlos-Laufschrift umgesetzt; kurze Titel bleiben statisch zentriert.
- Die Worker-Metadaten liefern zentral `raw_title`, `display_title`, `normalized_title`, `dj_display` und `dj_mode`.
- Bereits im Streamtitel vorhandene Identitäten wie Fraggle/Fraggel, FragglePower666, 666SOUNDsDESIGn oder LYVRA werden nicht erneut vorangestellt.
- Nackte Tracktitel erhalten zentral den Prefix `LYVRA is alive · 666SOUNDsDESIGn ·`.
- Auto-DJ-/Leer-/Legacy-Werte werden systemweit zu `LYVRA DJ`; echte Live-DJ-Namen bleiben dynamisch erhalten.
- Source-Main wird grün, Fallback cyan und direkte Reserve amber dargestellt; die alte irreführende pinke Source-Anzeige ist entfernt.
- Der Footer lautet vollständig: `L.Y.V.R.A. – Living Yielding Vibration and Resonance Architecture`.
- Hauptplayer, `/internal`, Audioquelle, Equalizer und Booster bleiben erhalten; geändert wurden nur AMARIS-UI, Metadatenaufbereitung und DJ-/Ticker-Anzeigewege.

## Release v1.2.5 — AMARIS Fullscreen, Auth Skip, 5-Band EQ, Discord, Audio Stability, Levelmeter

AMARIS wurde als eigenständiger Mini-Player-Endpunkt weiter ausgebaut. iPhone nutzt jetzt ein Ganzdisplay-Grid mit besserer vertikaler Verteilung. PC bleibt ein kompakter Miniplayer auf schwarzem Hintergrund. Neu sind geschützter Auto-DJ-Skip über die bestehende Admin-/Auth-Worker-Kette, Discord-Shooter, mobiles Soundpanel mit Boost `0–5`, mobiler 5-Band-EQ `SUB / LOW / MID / HIGH / AIR`, Audio-Recovery nach App-/Tab-Wechsel und ein kleines Bottom-Levelmeter. Bestehende Player, `/internal`, Worker-Switch-Kette, Auth-Hardlock und Hauptplayer-Audio bleiben erhalten.


## AMARIS v1.2.7

`FULLVERSION_AMARIS_BRANDING_BACKGROUND_ICONS_MEDIASESSION_v1.2.7`

- Canonical WebRadio Auth/Skip/Discord routes.
- Separate Skip/Discord feedback states.
- Audio-safe password modal handling.
- Cover-backed ticker with stream-cover fallback.


## VELUNA v1.2.8

`FULLVERSION_VELUNA_CENTRAL_BRANDING_RESPONSIVE_PLAYERS_v1.2.8`

- Kanonischer Endpunkt `/veluna`; alte AMARIS-Routen redirecten kompatibel.
- Zentrale VELUNA-Assets, responsiver Header/Hintergrund, Fallback-Cover, App-Icon-Pack und interner animierter Splash.
- Festes iPhone-Viewportlayout, begrenztes PC-Layout und gemeinsames Neon-Laserfarbsystem.
- Hauptplayer, Internal-Player, Auth, Skip, Discord, Audio, Booster und EQ bleiben erhalten.


## VELUNA v1.2.9

`FULLVERSION_VELUNA_IPHONE_FIXED_FULLSCREEN_GEOMETRY_v1.2.10`

Gezielter Desktop-Layout-Patch: Das zusätzliche VELUNA-Banner unterhalb der PC-Player wurde entfernt. Mobil bleibt das Banner ausschließlich im VELUNA-Panel erhalten.


## VELUNA v1.2.10

- iPhone-Player als unveränderlicher Ganzseiten-Player.
- Feste Viewport-Geometrie über `js/veluna-viewport-lock.js`.
- Overlays, Passwortdialoge und Bildschirmtastatur ohne Player-Reflow.
- Geometrie-Refresh nur bei echtem Orientierungswechsel.
- Desktop-Bottom-Banner bleibt entfernt.
