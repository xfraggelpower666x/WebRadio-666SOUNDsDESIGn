# AMARIS COMPLETE ANALYSIS / AUDIT v1.2.6

## Release

`FULLVERSION_AMARIS_CANONICAL_WEBRADIO_AUTH_SKIP_DISCORD_AUDIO_BOOST_COVER_v1.2.6`

## Ziel des Patches

AMARIS wurde nach dem Handoff auf die kanonischen WebRadio-Routen zurückgeführt. Ziel war nicht, neue Parallel-Backends zu bauen, sondern die bestehende WebRadio-/PW-/Auth-/Discord-/Skip-Struktur sauber zu benutzen.

## Reparierte Punkte

### 1. Auto-DJ-Skip

- AMARIS sendet jetzt direkt an `POST /api/admin/skip`.
- RadioBotAI-/Hybrid-Auth-Pfade werden für AMARIS nicht als Standard verwendet.
- Die Anfrage läuft über `window.S666AdminAuth.fetch()` mit Bearer-Token aus `/api/admin/login`.
- Rückmeldung im Player:
  - `SKIP: WebRadio-Auth läuft …`
  - `SKIP: sende an /api/admin/skip …`
  - `SKIP OK: /api/admin/skip bestätigt`
  - `SKIP FEHLER: <Backend-Fehler>`

### 2. Discord-Shooter

- AMARIS nutzt die WebRadio-Routen:
  - `POST /api/discord/message`
  - `POST /api/discord/manual`
  - `POST /api/discord/nowplaying`
- Discord und Skip besitzen getrennte Action-States.
- Der Discord-Button kann nicht mehr in den Skip-Aktionspfad fallen.
- Die Discord-Overlay-CSS wird in AMARIS explizit geladen; zusätzlich besitzt das Addon einen Inline-CSS-Fallback, falls die CSS-Datei aus Cache-/Deploy-Gründen nicht geladen wird.

### 3. Passwortmanager / iPhone Auth-Fenster

- Das bestehende Admin-Auth-Modal bleibt die zentrale Login-Oberfläche.
- `type="password"`, `name="password"` und `autocomplete="current-password"` bleiben aktiv.
- Das Auth-Overlay feuert jetzt offene/geschlossene Events, damit AMARIS die Audio-Kette während der Eingabe stabil halten kann.

### 4. Play-State-Schutz bei Dialogen

- Beim Öffnen von Skip-/Discord-Auth wird Audio nicht pausiert, nicht neu geladen und nicht neu verkabelt.
- Während das Passwortfenster offen ist, hält AMARIS AudioContext/Audioelement sanft aktiv.
- Nach Dialogschluss erfolgt ein Soft-Resume statt Full-Restart.

### 5. Booster / EQ

- Die WebAudio-Kette bleibt:
  `audioElement -> MediaElementSource -> Booster Gain -> 5-Band-EQ -> Analyser/Levelmeter -> destination`
- AMARIS setzt `crossorigin="anonymous"` am Audioelement.
- Booster/EQ bleiben iPhone-only; PC bleibt ohne Booster/EQ.

### 6. Cover + Ticker

- Das mittlere Feld trennt jetzt Stream-/Station-Cover und Track-Cover sauberer.
- Track-Cover wird 10 Sekunden eingeblendet.
- Danach fällt AMARIS auf Stream-/Station-Cover oder Fallback-Cover zurück.
- Der Ticker läuft weiterhin über dem Cover mit dunklem Schatten/Glow.

## Geänderte produktive Dateien

- `AMARIS/index.html`
- `amaris/index.html`
- `public/AMARIS/index.html`
- `public/amaris/index.html`
- `js/admin-auth-client.js`
- `public/js/admin-auth-client.js`
- `js/addons/discord-player-addon-v3.js`
- `public/js/addons/discord-player-addon-v3.js`
- `worker.js`
- `workers/webradio-666soundsdesign-worker/worker.js`
- `config/release.json`
- `public/config/release.json`
- `js/version-core.js`
- `public/js/version-core.js`
- `package.json`
- `package-lock.json`
- Release-/Audit-/Testdokumentation

## Bewusst nicht verändert

- Hauptplayer-Grundarchitektur
- `/internal` Notfallplayer als eigenes System
- Stream-Worker-Failover-Kette
- PW-/Auth-Hardlock-Vertrag
- Discord-Worker-Secrets
- SHOUTcast-/MyIDJ-Zugangsdaten
- Hauptplayer-EQ/Booster
- RadioBotAI-Botlogik; dieser Punkt bleibt separat geparkt

## Lokale Verifikation

```text
npm run verify: PASS
Node-Tests: 41 / 41 PASS
JavaScript-/MJS-Syntax: 111 PASS
Public-Spiegel: PASS
Worker-/Legacy-Spiegel: PASS
Nested ZIP-Dateien: 0
```

## Live-Test-Hinweis

Der echte Funktionspass für Auto-DJ-Skip und Discord-Shooter ist erst nach Deploy auf Cloudflare möglich, weil dort die produktiven Worker-Secrets, PW/Auth-Verkabelung, Discord-Webhook-Secrets und Stream-Admin-Konfiguration liegen.
