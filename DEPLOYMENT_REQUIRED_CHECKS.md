# Deployment Required Checks — Hardlock v1.2.0

Diese Prüfungen sind ein **Hard Gate**. Bei `WATCH`, `REPAIR`, `FAIL` oder unbekanntem Secret-Zustand darf nicht produktiv ausgerollt werden.

## 1. Lokale Freigabe

```bash
npm ci
npm run verify
```

Erwartung: sämtliche Release-Checks und Tests PASS.

## 2. Cloudflare Auth-Vertrag

Ohne Werte zu protokollieren prüfen:

- `AUTH_SECRET` auf Passwort- und Auth-Worker byteidentisch
- `ADMIN_SERVICE_TOKEN` auf WebRadio-, Passwort- und Auth-Worker byteidentisch, falls aktiviert
- `ADMIN_SERVICE_ORIGIN=https://webradio.666soundsdesign-broadcaster.com`
- `ALLOWED_ORIGIN=https://webradio.666soundsdesign-broadcaster.com`
- `PW_LOGIN_URL` zeigt auf den Passwort-Worker `/login`
- `ADMIN_AUTH_VERIFY_URL` zeigt auf den Auth-Worker `/verify`

Pflicht-Live-Test:

```text
korrektes Passwort → Token → verify valid → iss=666-system-pw → scope=admin → exp gültig
```

## 3. Player Alert / Render

Prüfen:

- `PLAYER_ALERT_BACKEND_URL`
- `PLAYER_ALERT_SERVICE_TOKEN` auf Worker und Render identisch
- starkes produktives `PLAYER_ALERT_RATE_SALT`
- `DATABASE_URL` verweist auf PostgreSQL
- `REQUIRE_SHARED_PERSISTENCE=true`
- Render `/health`: `shared_persistence=true`, `release_ready=true`

## 4. Stream und Audio

Prüfen:

- Hauptstream
- Backupstream
- HTTPS→HTTP-Fallback
- Notfallplayer
- manueller MAIN/BACKUP-Wechsel
- Meter reagiert vor Boost
- Boost verändert Lautstärke, nicht Meter-Normalisierung
- nur ein automatischer Audio-Recovery-Owner

## 5. Automatisierter Live-Check

```bash
BASE_URL="https://webradio.666soundsdesign-broadcaster.com" npm run verify:deployment
```

## 6. Geräteprüfung

- 1920×1080
- 1536×864
- 1366×768
- 1280×720
- iPhone Portrait/Landscape
- Android Portrait/Landscape

Abnahme:

- Discord und MSG anklickbar
- Passwortlogin funktioniert auf PC und iPhone
- Auto-DJ Skip funktioniert mit Status-LED
- Messenger sendet exakt einmal
- MAIN/BACKUP LEDs schalten den Stream
- keine unsichtbaren Touch-Blocker
- keine Layoutdeformation oder Seitenscrollbar

## 7. Merge-Gate

Erst mergen, wenn alle Punkte vollständig PASS sind. Ein lokaler PASS ersetzt keinen Live-PASS.


## v1.2.1 AMARIS endpoint checks

- [ ] `/` returns the normal main player.
- [ ] `/amaris` returns `A M A R I S - L Y V R A   MINIMAL WEBRADIO`.
- [ ] `/internal` still returns the existing internal emergency player.
- [ ] `/stream` and `/fallback-stream` remain available.
- [ ] `AMARIS/index.html` and `public/AMARIS/index.html` are byte-identical.
- [ ] Deploy ZIP has no wrapper folder.
