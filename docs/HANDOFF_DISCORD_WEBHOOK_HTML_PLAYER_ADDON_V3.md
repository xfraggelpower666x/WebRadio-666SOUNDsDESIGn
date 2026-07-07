# 666SOUNDsDESIGn — Discord/Webhook/HTML-Player Add-on V3 Hand-off

**Created:** 2026-05-07  
**Modified:** 2026-05-07  
**Status:** Add-on only / NO_KV / NO_R2 / notfallplayer-safe  
**Ziel:** Discord-Posts aus HTML-Player + iPhone/Scriptable, ohne den speziellen Worker-Kern zu zerstören.

---

## 1. Harte Schutzregeln

Nicht anfassen:

```text
/api/radio/stream
/api/radio/metadata
/api/radio/status
Stream-Fallback
Automatic Switch
Notfallplayer
Mainstream/Backstream-Routing
Metadata-Normalisierung
bestehende Player-Bedienlogik
```

Discord V3 darf nur neue Routen unter `/api/discord/*` ergänzen. Bei Fehlern muss das Add-on still/logisch fehlschlagen und darf niemals den Stream blockieren.

---

## 2. Gewünschte Funktionen

### A) Automatischer Trackwechsel-Post

```text
Track ändert sich im Player
→ Player ruft /api/discord/nowplaying
→ Worker postet: ▶️ Jetzt läuft: Artist – Titel
```

Keine Status-Spam-Posts. Keine 5/10-Minuten-Wiederholungen.

### B) Manuelles Posten der Player-Karte

```text
Button im Player oder Scriptable/iPhone
→ /api/discord/manual
→ Discord Embed mit:
- Radio-Name
- Domain/Subdomain
- Player-Link
- Stream-/Einbindungs-URL
- kurzer Radio-/Discord-Info
- Button zum Player
```

### C) Kleine LED im Player

LED-Zustände:

```text
Cyan  = Discord bereit
Gelb  = sendet
Grün  = Post OK
Lila  = Cooldown/Dedupe
Rot   = Fehler
```

Diese Anzeige soll in **beiden Playern** eingebaut werden: Hauptplayer und iPhone-/Notfallplayer-UI, sofern beide separate HTML/UI-Blöcke haben.

---

## 3. Dateien

```text
worker-addons/discord-notify-addon-v3.js
worker-addons/WORKER_INTEGRATION_SNIPPET_V3.txt
frontend-addons/discord-player-addon-v3.js
frontend-addons/discord-player-addon-v3.css
frontend-addons/HTML_INTEGRATION_SNIPPET_BOTH_PLAYERS_V3.html
Scriptable/Scripts/666SOUNDsDESIGn_DISCORD_PLAYER_CARD_iPHONE_V3.js
examples/manual-player-card.json
examples/nowplaying-track-change.json
docs/HANDOFF_DISCORD_WEBHOOK_HTML_PLAYER_ADDON_V3.md
docs/REPORT_DISCORD_WEBHOOK_HTML_PLAYER_ADDON_V3.txt
docs/AUDIT_DISCORD_WEBHOOK_HTML_PLAYER_ADDON_V3.json
```

---

## 4. Worker-Integration

Import ganz oben in `worker.js`:

```js
import { handleDiscordNotifyV3 } from './worker-addons/discord-notify-addon-v3.js';
```

Fetch-Signatur erweitern:

```js
export default {
  async fetch(request, env, ctx){
```

Direkt nach:

```js
const url = new URL(request.url);
```

Einfügen:

```js
const discordV3Response = await handleDiscordNotifyV3(request, env);
if (discordV3Response) return discordV3Response;
```

Das greift nur `/api/discord/manual`, `/api/discord/share`, `/api/discord/nowplaying`, `/api/discord/status`, `/api/discord/debug` ab. Alle anderen Routen laufen unverändert weiter.

---

## 5. Cloudflare Secret

Pflicht:

```text
DISCORD_WEBHOOK_URL
```

Optional:

```text
DISCORD_ADMIN_TOKEN
```

Keine Webhook-URL in Frontend, HTML, CSS, public JS oder Root-README schreiben.

---

## 6. Frontend-Integration in beide Player

CSS laden:

```html
<link rel="stylesheet" href="/frontend-addons/discord-player-addon-v3.css">
```

Slot an gewünschter Stelle:

```html
<div data-discord-addon-slot></div>
```

Config vor JS:

```html
<script>
window.S666_DISCORD_PLAYER_CONFIG = {
  radioName: '666SOUNDsDESIGn WebRadio',
  domain: 'webradio.666soundsdesign-broadcaster.com',
  playerUrl: 'https://webradio.666soundsdesign-broadcaster.com',
  streamUrl: 'https://webradio.666soundsdesign-broadcaster.com/api/radio/stream',
  discordInfo: 'Discord: 666SOUNDsDESIGn Cyber Radio Community',
  embedInfo: 'Einbindung: Webradio-Stream über https://webradio.666soundsdesign-broadcaster.com/api/radio/stream',
  autoPostTrackChanges: true,
  trackPollMs: 15000
};
</script>
<script src="/frontend-addons/discord-player-addon-v3.js"></script>
```

Wichtig: Wenn Hauptplayer und iPhone-/Notfallplayer separate DOMs haben, denselben Slot jeweils dort setzen, wo die LED sichtbar sein soll.

---

## 7. Track-Erkennung

Das Frontend-Add-on sucht Tracktext automatisch in:

```text
[data-now-playing]
[data-track-title]
#nowPlaying
#now-playing
.now-playing
.track-title
.song-title
.metadata-title
window.S666_NOW_PLAYING
window.radioMetadata
```

Wenn der aktuelle Player andere IDs/Klassen verwendet, im anderen Chat nur diese Selektoren ergänzen. Nicht die Playerlogik umbauen.

---

## 8. Scriptable/iPhone

Datei:

```text
Scriptable/Scripts/666SOUNDsDESIGn_DISCORD_PLAYER_CARD_iPHONE_V3.js
```

Funktion:

```text
- manuelle Player-Karte senden
- Daten bearbeiten
- gespeicherte Daten löschen
```

Scriptable sendet standardmäßig an:

```text
https://webradio.666soundsdesign-broadcaster.com/api/discord/manual
```

Die Webhook-URL bleibt im Worker Secret. Kein Direkt-Webhook nötig.

---

## 9. Tests

Status:

```text
GET /api/discord/status
```

Manuell:

```text
POST /api/discord/manual
```

Trackwechsel:

```text
POST /api/discord/nowplaying
```

Body-Beispiele liegen unter `examples/`.
