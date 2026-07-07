# 666SOUNDsDESIGn — Discord Embed + Player Button Addon V1

**Created:** 2026-05-05  
**Modified:** 2026-05-05  
**Status:** ADD-ONLY / EXTEND-FIRST / SECRET-SAFE  
**Purpose:** Discord-Karte mit Vorschau und Button `▶️ Player öffnen` für den bestehenden Webradio-Player.

---

## 1. Ergebnis

Dieses Addon erzeugt eine Discord-Nachricht mit:

- Titel: `🎧 666SOUNDsDESIGn WebRadio`
- Vorschau-Bild: `assets/discord/discord-preview.svg`
- Statuszeilen: Now Playing / Source / Listeners
- Button: `▶️ Player öffnen`
- Linkziel: `https://webradio.666soundsdesign-broadcaster.com`

Discord kann keinen echten HTML-Player direkt im Chat ausführen. Dieses Addon nutzt daher die stabile Variante: **Embed + Link-Button**.

---

## 2. Dateien im Paket

```text
666SOUNDsDESIGn_DISCORD_EMBED_ADDON_V1/
├─ worker-addons/
│  ├─ discord-embed-addon.js
│  └─ WORKER_INTEGRATION_SNIPPET.txt
├─ Scriptable/
│  └─ Scripts/
│     └─ 666SOUNDsDESIGn_DISCORD_PLAYER_CARD_iPHONE.js
├─ tools/
│  └─ pc/
│     ├─ send-discord-player-card.ps1
│     └─ SEND_DISCORD_PLAYER_CARD_PC.bat
├─ assets/
│  └─ discord/
│     └─ discord-preview.svg
├─ examples/
│  └─ discord-player-card-direct-payload.json
└─ docs/
   └─ HANDOFF_DISCORD_EMBED_PLAYER_V1.md
```

---

## 3. Sicherheitsregel

Die Discord-Webhook-URL darf **nicht** in öffentliches HTML, öffentliches JS oder GitHub Pages Frontend geschrieben werden.

Richtige Kette:

```text
iPhone / PC / Admin Button
→ Cloudflare Worker Endpoint
→ Discord Webhook Secret
→ Discord Channel
```

Secret im Worker:

```text
DISCORD_WEBHOOK_URL
```

Optionaler Schutz:

```text
DISCORD_ADMIN_TOKEN
```

---

## 4. Cloudflare Worker Integration

### 4.1 Dateien ins Repo legen

Die Datei muss im Repo landen:

```text
worker-addons/discord-embed-addon.js
```

Das Vorschau-Bild muss hier landen:

```text
assets/discord/discord-preview.svg
```

### 4.2 `worker.js` minimal patchen

Ganz oben in `worker.js` einfügen:

```js
import { handleDiscordPlayerCard } from './worker-addons/discord-embed-addon.js';
```

In der `fetch`-Funktion direkt nach:

```js
const url = new URL(request.url);
```

folgenden Block einfügen:

```js
if (url.pathname === '/api/discord/player-card') {
  return handleDiscordPlayerCard(request, env);
}
```

Wichtig: Wenn dein Projekt den Worker doppelt führt, also Root-Worker und Worker-Unterordner, dann denselben Patch in beide aktiven Worker-Dateien einfügen. Nicht nur in eine Kopie.

---

## 5. Cloudflare Secret setzen

### Cloudflare Dashboard

1. Cloudflare öffnen
2. Worker auswählen
3. Settings / Variables öffnen
4. Secret hinzufügen:

```text
DISCORD_WEBHOOK_URL = https://discord.com/api/webhooks/...
```

Optional:

```text
DISCORD_ADMIN_TOKEN = eigenes_geheimes_admin_token
```

### Wrangler / Terminal

```bash
wrangler secret put DISCORD_WEBHOOK_URL
```

Optional:

```bash
wrangler secret put DISCORD_ADMIN_TOKEN
```

Die Werte gehören nicht in `wrangler.jsonc`, nicht in `worker.js`, nicht in `index.html`.

---

## 6. Test nach Deploy

### Browser-Test

Öffnen:

```text
https://webradio.666soundsdesign-broadcaster.com/api/discord/player-card
```

Erwartet:

```json
{
  "ok": true,
  "addon": "666SOUNDsDESIGn Discord Embed Addon",
  "version": "V1.0"
}
```

### Sende-Test

Per iPhone Scriptable oder PC BAT senden.

---

## 7. iPhone Nutzung

Datei:

```text
Scriptable/Scripts/666SOUNDsDESIGn_DISCORD_PLAYER_CARD_iPHONE.js
```

Ablauf:

1. Scriptable öffnen
2. Neues Script erstellen
3. Inhalt der Datei einfügen
4. Script starten
5. `Worker-Modus senden` wählen

Standard-Endpoint:

```text
https://webradio.666soundsdesign-broadcaster.com/api/discord/player-card
```

Wenn `DISCORD_ADMIN_TOKEN` im Worker gesetzt wurde, muss derselbe Token einmal in Scriptable gespeichert werden. Das Script fragt bei Bedarf danach und speichert ihn im iOS Keychain.

Notfallmodus:

- `Direkt-Webhook senden`
- Webhook wird im iOS Keychain gespeichert
- Nur benutzen, wenn Worker noch nicht fertig ist

Empfehlung bleibt: **Worker-Modus**.

---

## 8. PC Nutzung

Dateien:

```text
tools/pc/SEND_DISCORD_PLAYER_CARD_PC.bat
tools/pc/send-discord-player-card.ps1
```

Ablauf:

1. Ordner `tools/pc/` öffnen
2. `SEND_DISCORD_PLAYER_CARD_PC.bat` doppelklicken
3. PowerShell sendet an den Worker Endpoint

Wenn ein Admin Token nötig ist:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\send-discord-player-card.ps1 -AdminToken "DEIN_TOKEN"
```

---

## 9. Optional: Player-Admin-Button später

Später kann im Player ein Admin-Button eingebaut werden:

```js
await fetch('/api/discord/player-card', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-admin-token': 'NICHT_IM_PUBLIC_FRONTEND_SPEICHERN'
  },
  body: JSON.stringify({
    nowPlaying: currentTitle,
    listeners: currentListeners,
    source: currentSource
  })
});
```

Achtung: Wenn der Button öffentlich sichtbar ist, darf dort kein geheimer Token stehen. Für einen echten Admin-Button braucht es vorher dein bestehendes Auth-/Admin-System oder einen serverseitigen Schutz.

---

## 10. Discord Channel vorbereiten

1. Discord Server öffnen
2. Kanal auswählen
3. Kanal-Einstellungen
4. Integrationen
5. Webhooks
6. Neuer Webhook
7. Zielkanal wählen
8. Webhook-URL kopieren
9. Als Cloudflare Secret `DISCORD_WEBHOOK_URL` speichern

---

## 11. Keine destruktiven Änderungen

Dieses Addon:

- ersetzt keinen Player
- verändert keine Stream-URL
- verändert keine Metadata-Route
- verändert keine History-Route
- schreibt keine Secrets in öffentliche Dateien
- funktioniert als Zusatzroute `/api/discord/player-card`

---

## 12. Fehlerbilder

### `DISCORD_WEBHOOK_URL secret missing`

Secret fehlt im Cloudflare Worker.

### `Unauthorized`

`DISCORD_ADMIN_TOKEN` ist gesetzt, aber iPhone/PC sendet keinen oder falschen `x-admin-token`.

### Discord sendet nichts, Worker sagt `502`

Webhook-URL falsch, gelöscht oder Discord blockiert die Anfrage.

### Button fehlt

Discord benötigt Webhook-Aufruf mit:

```text
?with_components=true
```

Das Addon hängt diesen Parameter automatisch an.

---

## 13. Empfohlener Ablauf für dein Repo

1. ZIP entpacken
2. Ordner in Repo-Root kopieren
3. `worker.js` nach Snippet patchen
4. Falls doppelter Worker aktiv ist: beide Worker-Dateien patchen
5. Cloudflare Secret setzen
6. GitHub Upload via Scriptable
7. Cloudflare Deploy prüfen
8. iPhone Script starten
9. Discord Channel kontrollieren

Fertig.
