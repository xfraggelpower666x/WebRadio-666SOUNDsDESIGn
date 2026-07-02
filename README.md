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


## Release v1.2.1 — AMARIS minimal recovery player

- New standalone page: `AMARIS/index.html`
- Public endpoint: `/amaris`
- Direct primary: `https://my.idjstream.com:8686`
- Direct fallback: `https://my.idjstream.com:8686/stream`
- Additional emergency chain: `/stream` then `/fallback-stream`
- Existing internal emergency player remains available at `/internal` and was preserved byte-for-byte.
- Root/public mirrors and the legacy Worker mirror are synchronized.
- Safe-root deploy packaging is required; the source download ZIP contains a wrapper folder and must not be uploaded as-is.
