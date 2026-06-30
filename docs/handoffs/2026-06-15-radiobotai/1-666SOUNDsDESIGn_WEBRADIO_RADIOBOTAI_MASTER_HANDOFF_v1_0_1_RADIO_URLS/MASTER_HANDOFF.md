# 666SOUNDsDESIGn - MASTER HANDOFF

> **AUTH-HARDLOCK-HINWEIS (2026-06-30):** Alle Auth-Angaben dieses historischen Handoffs werden durch `docs/AUTH_ARCHITECTURE_CANONICAL_v1_0_0.md` ersetzt. Login ausschließlich über den Passwort-Worker `/login`, Verifikation ausschließlich über den Auth-Worker `/verify`; kein Healthcheck als Authentifizierung.

## WebRadio Repo / Codebau / Discord-Shooter / 666 RadioBotAI / Dashboard

Version: v1.0.0
Datum: 2026-06-08
Status: AKTIV
Ziel: Übergabe an anderen Chat / Coding-Agent / Codex / Bot-Builder

---

# 1. MASTER-REGEL

Dieses Projekt wird nicht durch Draufklatschen gebaut.

Es gilt immer:

```text
ERHALTEN -> PRÜFEN -> GEZIELT REPARIEREN -> SAUBER ERWEITERN -> DIREKT NUTZBAR LIEFERN
```

Keine Layer-auf-Layer-Architektur.
Keine defekten Systeme ausblenden.
Keine Parallel-Systeme bauen, wenn ein bestehender Layer repariert werden kann.
Keine eigenmächtigen Kürzungen.
Keine eigenmächtigen Verschönerungen.
Keine eigenmächtigen Architekturumbauten.
Komplizierte Systeme dürfen kompliziert aussehen.

Funktion, Stabilität, Nachvollziehbarkeit und bestehende Struktur sind wichtiger als optische Code-Schönheit.

---

# 2. CODEBAU-HARDLOCK

## Verboten

```text
- neue Layer über defekte Layer legen
- defekte Funktionen durch display:none oder Dummy-Elemente verstecken
- bestehende Funktionen durch neue Parallel-Funktionen ersetzen, ohne den alten Layer zu reparieren
- bestehende HTML/CSS/JS-Struktur eigenmächtig umbauen
- funktionierende Systeme kürzen oder vereinfachen
- Code "verschönern", wenn dadurch Struktur oder Funktion verändert wird
- neue Ordner-/Repo-Strukturen erfinden
- hunderte unnötige Verzeichnisse erzeugen
- ZIP-in-ZIP-Ketten erzeugen
- Secrets/Tokens/Webhooks in öffentliche Dateien schreiben
- Uploads aus mehreren Chats parallel durchführen
```

## Pflicht

```text
- aktuelle Struktur lesen
- betroffenen Layer finden
- Ursache im aktuellen Layer reparieren
- ersetzte alte Logik physisch entfernen, wenn sicher
- bestehende Funktionen schützen
- Änderungen dokumentieren
- finale uploadbare ZIP liefern
- keine echten Secrets in Code, Chat, README, Changelog oder Frontend-Dateien
```

---

# 3. GITHUB / REPO IDENTITÄT

## Owner

```text
xfraggelpower666x
```

## Repo

```text
WebRadio-666SOUNDsDESIGn
```

## Branch

```text
WebRadio-666SOUNDsDESIGn
```

## Produktivdomain

```text
https://webradio.666soundsdesign-broadcaster.com
```

## GitHub Pages Player

```text
https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/external-player/
```

---

# 4. BACKEND / BROKER

## Backend-Typ

```text
Cloudflare Worker
```

## Worker-Name

```text
webradio-666soundsdesign-worker
```

## Hauptdatei

```text
worker.js
```

## Cloudflare Config

```text
wrangler.jsonc
```

## Worker-Konfiguration

```json
{
  "name": "webradio-666soundsdesign-worker",
  "main": "worker.js",
  "compatibility_date": "2024-05-15"
}
```

Der Cloudflare Worker ist der zentrale Broker für:

```text
- Player-Auslieferung
- Stream-Proxy
- Fallback-Stream
- NowPlaying / Metadaten
- Broadcast / Player Alert
- Admin Config
- Chaos Engine API
- Discord-Shooter / Webhook Bridge
- später zentraler Dashboard-Endpunkt
```

---

# 5. AKTUELLE REPO-STRUKTUR - WICHTIGE BEREICHE

Geprüfter Stand:

```text
WebRadio-666SOUNDsDESIGn_e6bd57_SCRIPTABLE_SAFE_ROOT_20260607.zip
```

Wichtige Struktur:

```text
WebRadio-666SOUNDsDESIGn/
├─ worker.js
├─ wrangler.jsonc
├─ index.html
│
├─ config/
│  ├─ radio-runtime.json
│  ├─ stream.config.js
│  └─ ui.config.js
│
├─ worker-addons/
│  ├─ discord-notify-addon-v3.js
│  ├─ radio-admin-config-addon.js
│  └─ chaos-engine-api-addon.js
│
├─ js/
│  └─ addons/
│     ├─ discord-player-addon-v3.js
│     └─ discord-embed-v83.js
│
├─ css/
│  └─ addons/
│     ├─ discord-player-addon-v3.css
│     └─ discord-embed-v83.css
│
├─ core/
│  └─ overlay/
│     ├─ overlay-core.js
│     └─ overlay-core.css
│
├─ docs/
│  ├─ ADMIN_DISCORD_SHOOTER_MERGE_V1_2026-05-25.md
│  ├─ AUDIT_ADMIN_DISCORD_SHOOTER_MERGE_V1_2026-05-25.json
│  ├─ AUDIT_DISCORD_PRIVATE_TRACKPOST_V1_2026-05-28.json
│  ├─ AUDIT_DISCORD_PRIVATE_TRACK_SHOOTER_SECRET_FIX_V1_2026-05-30.json
│  ├─ AUDIT_DISCORD_WEBHOOK_HTML_PLAYER_ADDON_V3.json
│  ├─ AUDIT_v168_DUAL_DISCORD_SINGLE_EQ.json
│  ├─ AUDIT_v170_GLOBAL_BROADCAST_DUAL_DISCORD_EQ_CENTER.md
│  └─ AUDIT_v171_KV_DUALDISCORD_EQ_NUDGE.md
│
├─ external-player/
├─ cockpit-player/
├─ assets/
├─ CHAOS_ENGINE/
├─ external-workers/
└─ Scriptable/
```

---

# 6. AKTIVE RADIO-ENDPUNKTE

```text
GET  /
GET  /health
GET  /debug
GET  /debug/routes
GET  /debug/modules

GET  /stream
GET  /fallback-stream
GET  /api/nowplaying

GET  /api/player-alert/status
GET  /api/player-alert/current
GET  /api/player-alert/history
POST /api/player-alert/send

GET  /api/discord/status
GET  /api/discord/debug
POST /api/discord/manual
POST /api/discord/share
POST /api/discord/message
POST /api/discord/nowplaying

GET  /The-Dark-Dancer
GET  /CHAOS_ENGINE/*
POST /api/admin/*
POST /api/chaos/*
```

---

# 7. RADIO-ENDPUNKTE FÜR BOT / DASHBOARD / SHOOTER

```text
RADIO_BASE_URL=https://webradio.666soundsdesign-broadcaster.com
RADIO_STREAM_URL=https://webradio.666soundsdesign-broadcaster.com/stream
RADIO_FALLBACK_STREAM_URL=https://webradio.666soundsdesign-broadcaster.com/fallback-stream
RADIO_NOWPLAYING_URL=https://webradio.666soundsdesign-broadcaster.com/api/nowplaying
RADIO_HEALTH_URL=https://webradio.666soundsdesign-broadcaster.com/health
RADIO_EXTERNAL_PLAYER_URL=https://webradio.666soundsdesign-broadcaster.com/extern
RADIO_INTERNAL_PLAYER_URL=https://webradio.666soundsdesign-broadcaster.com/internal
```

---

# 8. DISCORD-SHOOTER IST BEREITS IM RADIO DRIN

Der Discord-Shooter ist bereits Bestandteil des Radio-Projekts.

## Backend-Datei

```text
worker-addons/discord-notify-addon-v3.js
```

## Addon-Version

```text
V3.11-20260530-PRIVATE-TRACK-SHOOTER-SECRET
```

## Worker-Import

```js
import { handleDiscordNotifyV3 } from './worker-addons/discord-notify-addon-v3.js';
```

## Worker-Routing

```js
const discordV3Response = await handleDiscordNotifyV3(request, env);
if (discordV3Response) return discordV3Response;
```

## Aktive Discord-Shooter-Routen

```text
GET  /api/discord/status
GET  /api/discord/debug

POST /api/discord/manual
POST /api/discord/share
POST /api/discord/message
POST /api/discord/nowplaying
```

---

# 9. DISCORD-SHOOTER FRONTEND

## Aktive Frontend-Datei

```text
js/addons/discord-player-addon-v3.js
```

## Version

```text
V3.8-20260508-MANUAL-BROADCAST-AUTO-NOWPLAYING
```

## Frontend-Buttons

```text
DC
MSG
```

## Default-Endpunkte

```js
endpointManual: '/api/discord/manual'
endpointNowPlaying: '/api/discord/nowplaying'
endpointMessage: '/api/discord/message'
endpointStatus: '/api/discord/status'
```

## Funktion

```text
DC öffnet Gate/Access Overlay und kann manuelle Player-/Radio-Karte posten.
MSG öffnet Message Overlay und sendet freie Nachricht an Discord.
Nach erfolgreichem Unlock können automatische kompakte NowPlaying-Posts bei Trackwechseln ausgelöst werden.
```

---

# 10. DISCORD-SHOOTER WEBHOOK-/KANAL-LOGIK

In der geprüften ZIP stehen keine echten Discord-Channel-IDs und keine echten Webhook-URLs im Klartext.

Die Kanalsteuerung läuft über Cloudflare Worker Secrets.

## Haupt-Webhook

Akzeptierte Secret-Namen:

```env
DISCORD_WEBHOOK_URL=
DISCORD_WEBHOOK=
DISCORD_WEBHOOK_URI=
DISCORD_WEBHOOK_ENDPOINT=
WEBHOOK_URL=
```

## Privater Track-/NowPlaying-Webhook

Akzeptierte Secret-Namen:

```env
DISCORD_PRIVATE_TRACK_WEBHOOK_URL=
DISCORD_PRIVATE_WEBHOOK_URL=
DISCORD_RUBY_TRACK_WEBHOOK_URL=
DISCORD_TRACK_PRIVATE_WEBHOOK=
PRIVATE_DISCORD_WEBHOOK_URL=
PRIVATE_TRACK_SHOOTER=
```

## Admin-/Gate-Schutz

```env
DISCORD_ADMIN_TOKEN=
DISCORD_GATE_CODE=
DISCORD_GATE_SHA256=
ADMIN_AUTH_VERIFY_URL=
```

## Admin Auth Default

```text
https://666-system-auth.666soundsdesign-broadcaster.com/verify
```

---

# 11. WAS DER SHOOTER POSTET

## /api/discord/manual

Postet große manuelle Radio-/Player-Broadcast-Karte mit:

```text
- 666SOUNDsDESIGn Digital Underground Intro
- Radio-/Stream-Links
- Social Links
- DistroKid Links
- Copyright / Branding
- NowPlaying-Metadaten
- Listener
- Bitrate
- DJ / Status
- Source
```

## /api/discord/share

Alias / gleiche Logik wie Manual.

## /api/discord/message

Postet freie Nachricht aus dem MSG-Overlay mit:

```text
- Message Text
- Radio-Metadaten
- Radio-/Social-Links
```

## /api/discord/nowplaying

Postet kompakte NowPlaying-Karte mit:

```text
- aktueller Track
- Listener
- Bitrate
- DJ / Status
- Source
- Artwork, falls gültig
```

Optional wird NowPlaying an den privaten Track-Webhook gespiegelt.

---

# 12. SHOOTER ACCESS / SCHUTZ

## Header

```text
x-admin-token
x-discord-gate-code
```

## Schutzprüfung

Der Shooter akzeptiert Zugriff über:

```text
1. Admin Auth Cookie / Bearer Token über ADMIN_AUTH_VERIFY_URL
2. oder Legacy Discord Gate Code
```

## Gate Code

Wenn `DISCORD_GATE_CODE` gesetzt ist:

```text
Eingabe muss exakt DISCORD_GATE_CODE entsprechen.
```

Wenn kein `DISCORD_GATE_CODE` gesetzt ist:

```text
Fallback über DISCORD_GATE_SHA256 oder internen Fallback-Hash.
```

---

# 13. SHOOTER DEDUPE / COOLDOWN

## NowPlaying Cooldown

```text
20 Sekunden
```

Konstante:

```js
MIN_TRACK_COOLDOWN_MS = 20000
```

## Manual Cooldown

```text
10 Sekunden
```

Konstante:

```js
MIN_MANUAL_COOLDOWN_MS = 10000
```

## Runtime-Speicher

```js
globalThis.__S666_DISCORD_V3_RUNTIME__
```

Speichert:

```text
- lastTrackKey
- lastTrackAt
- lastManualAt
- lastOkAt
- lastErrorAt
- lastError
- lastKind
```

---

# 14. BROADCAST / PLAYER ALERT IST GETRENNT VOM DISCORD-SHOOTER

## Broadcast Backend

Aktive Worker-Funktion:

```text
handlePlayerAlertV152
```

## Routen

```text
/api/player-alert/status
/api/player-alert/current
/api/player-alert/history
/api/player-alert/send
```

## Broker-Reihenfolge

```text
1. Renda/Render Backend
2. PLAYER_ALERT_KV
3. Cloudflare Cache
```

## Backend ENV

```env
PLAYER_ALERT_BACKEND_URL=
RENDA_PLAYER_ALERT_URL=
RENDER_PLAYER_ALERT_URL=
RENDA_BACKEND_URL=
RENDER_BACKEND_URL=
PLAYER_ALERT_KV=
```

Wichtig:

```text
Discord ist hier NICHT das primäre Player-Nachrichtensystem.
```

Broadcast / Player Alert und Discord-Shooter sind getrennte Backend-Systeme.
Beide laufen über `worker.js`, aber mit unterschiedlichen Routen.

---

# 15. RUNTIME CONFIG

Datei:

```text
config/radio-runtime.json
```

Wichtige Werte:

```json
{
  "broadcastStatusUrl": "/api/player-alert/status",
  "discordStatusUrl": "/api/discord/status",
  "adminAuthVerifyUrl": "https://666-system-auth.666soundsdesign-broadcaster.com/verify",
  "adminAuthLoginUrl": "https://666-system-pw.666soundsdesign-broadcaster.com/login",
  "sunoWorkerUrl": "https://666-suno-system.666soundsdesign-broadcaster.com",
  "chaosAiWorkerUrl": "https://666-chaos-ai-track-system.666soundsdesign-broadcaster.com"
}
```

---

# 16. 666 RADIOBOTAI / DISCORD RADIOCOREBOT - RÜCKFÜHRUNGSREGEL

Der Discord RadioCoreBot / 666 RadioBotAI darf in einem anderen Chat oder Coding-Agenten vorbereitet werden.

Aber:

```text
Der fertige Bot darf NICHT separat produktiv in die WebRadio-Repo hochgeladen werden.
```

Der fertige Bot muss an diesen WebRadio-Repo-Integrationschat zurückgegeben werden.

Akzeptierte Übergabeformen:

```text
1. vollständige Bot-ZIP
2. vollständiger Bot-Ordner
3. vollständige Projekt-ZIP mit Bot-Verzeichnis
4. vollständiger Codex-/Agent-Export
5. komplette Dateien mit klarer Ordnerstruktur
```

Nicht ausreichend:

```text
- einzelne Snippets
- nur README
- nur package.json
- nur Command-Dateien ohne Main-Startdatei
- nur Konzept
- Bot-Code ohne ENV-Beispiel
- Bot-Code ohne Start-/Installationshinweise
- Bot-Code ohne Angabe der geänderten Dateien
```

---

# 17. BOT-INTEGRATION IN DIE WEBRADIO-REPO

## Ziel-Repo

```text
xfraggelpower666x/WebRadio-666SOUNDsDESIGn
```

## Branch

```text
WebRadio-666SOUNDsDESIGn
```

## Standard-Zielordner

```text
discord-bot/
```

## Gewünschte Struktur

```text
discord-bot/
├─ README.md
├─ package.json
├─ .env.example
├─ src/
│  ├─ index.js
│  ├─ config/
│  │  ├─ env.js
│  │  └─ channels.js
│  ├─ commands/
│  │  ├─ play.js
│  │  ├─ stop.js
│  │  ├─ pause.js
│  │  ├─ resume.js
│  │  ├─ volume.js
│  │  ├─ nowplaying.js
│  │  ├─ info.js
│  │  ├─ next.js
│  │  ├─ status.js
│  │  └─ reconnect.js
│  ├─ radio/
│  │  ├─ stream-client.js
│  │  ├─ metadata-client.js
│  │  └─ playback-controller.js
│  ├─ shooter/
│  │  ├─ shooter-client.js
│  │  ├─ shooter-types.js
│  │  └─ shooter-targets.js
│  ├─ voice/
│  │  ├─ voice-join.js
│  │  ├─ voice-player.js
│  │  └─ reconnect-watchdog.js
│  └─ utils/
│     ├─ logger.js
│     └─ safe-json.js
└─ docs/
   ├─ SETUP.md
   ├─ ENV.md
   └─ COMMANDS.md
```

Falls der fertige Bot anders aufgebaut ist, gilt:

```text
Bestehende Bot-Struktur erhalten.
Nicht eigenmächtig in diese Beispielstruktur pressen.
Nur dann umstrukturieren, wenn es für Integration, Startbarkeit oder Upload-Sicherheit notwendig ist.
```

---

# 18. BOT MUSS VORHANDENE RADIO-ENDPUNKTE NUTZEN

Der Bot soll die bestehende Radio-Infrastruktur verwenden:

```text
RADIO_BASE_URL=https://webradio.666soundsdesign-broadcaster.com
RADIO_STREAM_URL=https://webradio.666soundsdesign-broadcaster.com/stream
RADIO_FALLBACK_STREAM_URL=https://webradio.666soundsdesign-broadcaster.com/fallback-stream
RADIO_NOWPLAYING_URL=https://webradio.666soundsdesign-broadcaster.com/api/nowplaying
RADIO_HEALTH_URL=https://webradio.666soundsdesign-broadcaster.com/health
```

Der Bot soll vorhandene Discord-Shooter-Endpunkte verwenden:

```text
DISCORD_SHOOTER_STATUS_URL=https://webradio.666soundsdesign-broadcaster.com/api/discord/status
DISCORD_SHOOTER_MANUAL_URL=https://webradio.666soundsdesign-broadcaster.com/api/discord/manual
DISCORD_SHOOTER_MESSAGE_URL=https://webradio.666soundsdesign-broadcaster.com/api/discord/message
DISCORD_SHOOTER_NOWPLAYING_URL=https://webradio.666soundsdesign-broadcaster.com/api/discord/nowplaying
```

---

# 19. BOT-KOMMANDOS

Pflicht-Kommandos:

```text
/play
/stop
/pause
/resume
/volume
/nowplaying
/info
/next
/status
/reconnect
```

Optional später:

```text
/preset1
/preset2
/preset3
/preset4
/preset5
/playlist
/shooter-test
```

## Volume-Standard

```text
0-200
```

Default:

```text
100
```

Safe-Bereich:

```text
0-150
```

Boost-Bereich:

```text
151-200
```

Verboten:

```text
0-500
```

---

# 20. DASHBOARD-REGEL

Das neue 666 RadioBotAI Dashboard soll zentral in der WebRadio-Repo verfügbar gemacht werden.

Bevorzugte Architektur:

```text
Dashboard zentral über Cloudflare Worker-Endpunkt bereitstellen.
```

Empfohlener Endpunkt:

```text
/dashboard
```

Produktiv-URL:

```text
https://webradio.666soundsdesign-broadcaster.com/dashboard
```

## Wichtig

Das Dashboard darf NICHT in den geschützten Admin-Bereich des Radios eingebaut werden.

Grund:

```text
Das Dashboard kann öffentliche oder halböffentliche Inhalte enthalten:
- YouTube Music
- SoundCloud
- Spotify / Apple / Amazon / Social Links
- Radioinformationen
- Now Playing
- Bot-Status
- Stream-Status
- öffentliche Projektinfos
```

Daher:

```text
Dashboard bekommt eigenen Player-Menüpunkt.
Admin-Menü bleibt für geschützte Admin-Funktionen.
```

## Player-Menü

Ziel:

```text
Player-Menü
├─ Play / Stop / Volume
├─ Sound / EQ
├─ Discord / Message
├─ Dashboard
└─ Admin
```

Gültig für:

```text
PC Player
iPhone Player
externer Player
Cockpit Player, falls dort passend
```

## Geschützte Funktionen

Wenn das Dashboard später Steuerfunktionen enthält, müssen diese separat geschützt werden:

```text
- Skip
- Playlist wechseln
- Bot starten/stoppen
- Admin Broadcast senden
- Discord-Shooter senden
- Volume ändern
- Config ändern
- Secrets prüfen
```

Öffentliche Dashboard-Ansicht darf offen sein.
Steuerfunktionen brauchen Auth-Prüfung.

---

# 21. DASHBOARD-INTEGRATION

Wenn der neue Bot ein eigenes Dashboard mitbringt:

```text
Der Bot samt Dashboard wird hierher zurückgegeben.
Das Dashboard wird nicht separat produktiv hochgeladen.
Es wird zentral in die WebRadio-Repo integriert.
```

Mögliche Zielstruktur:

```text
discord-bot/
├─ src/
├─ docs/
└─ dashboard/
```

oder:

```text
dashboard/
├─ index.html
├─ assets/
├─ css/
└─ js/
```

Finale Entscheidung richtet sich nach der gelieferten Bot-Struktur.
Bestehende Struktur wird erhalten.

---

# 22. UPLOAD-REGEL

Finaler Upload erfolgt nicht aus dem Bot-Chat.

Finaler Upload erfolgt über die konsolidierte WebRadio-Repo-Struktur.

Pflicht:

```text
Eine finale Gesamt-ZIP.
Eine Repo-Struktur.
Ein Upload-Stand.
Ein Changelog.
Kein paralleler Upload aus mehreren Chats.
```

---

# 23. SICHERHEIT / SECRETS

Echte Discord-Webhooks, Bot-Tokens, Admin-Tokens, GitHub-Tokens und Passwörter dürfen niemals in öffentliche Dateien.

Erlaubt:

```text
Cloudflare Worker Secrets
lokale .env
privater Server-Secret-Store
iPhone Keychain, falls Scriptable nötig
```

Verboten:

```text
index.html
worker.js im Klartext
external-player/js/*.js
cockpit-player/js/*.js
config/*.js
README.md
öffentliche ZIP
GitHub Repo
Chat-Antwort
Screenshot
Changelog
```

---

# 24. ANWEISUNG FÜR ANDERE CHATS / CODING-AGENTEN

```text
Der fertige Discord RadioCoreBot / 666 RadioBotAI darf nicht separat produktiv in die WebRadio-Repo hochgeladen werden.

Der Bot muss als vollständige ZIP oder vollständiger Ordner an den WebRadio-Repo-Integrationschat zurückgegeben werden.

Dort wird er in die bestehende Repo-Struktur xfraggelpower666x/WebRadio-666SOUNDsDESIGn auf Branch WebRadio-666SOUNDsDESIGn eingebaut.

Der bestehende Cloudflare Worker webradio-666soundsdesign-worker, die vorhandenen /api/discord/* Shooter-Routen und die bestehende Player-/Broadcast-/Radio-Struktur bleiben maßgeblich.

Das neue Dashboard wird zentral über die WebRadio-Repo integriert und bevorzugt über /dashboard bereitgestellt.

Das Dashboard darf nicht ins geschützte Admin-Menü, sondern bekommt einen eigenen Player-Menüpunkt für PC und iPhone.

Öffentliche Inhalte wie YouTube Music, SoundCloud, Radioinfos und Streamstatus bleiben ohne Admin-Passwort erreichbar.

Echte Steuerfunktionen bleiben separat geschützt.

Keine Secrets, Tokens oder Webhooks in öffentliche Dateien schreiben.
Keine parallele Bot-/Shooter-/Backend-Struktur erzeugen.
Keine eigenmächtigen Kürzungen, Verschönerungen oder Architekturänderungen.
```

---


---

# 26. RADIOADRESSEN / STREAM-URLS / EXTERNE RADIO-LINKS

Dieser Abschnitt ist verbindlich für Bot, Dashboard, Player, Worker, Discord-Shooter, NowPlaying, Streamstatus und zukünftige Integrationen.

Keine Stream-URL eigenmächtig ersetzen.
Keine Domain eigenmächtig ändern.
Keine funktionierende Stream-Adresse entfernen.
Wenn eine neue Adresse ergänzt wird, muss sie zusätzlich dokumentiert werden.

---

## 26.1 Hauptdomain

```text
https://webradio.666soundsdesign-broadcaster.com
```

Ohne Slash:

```text
https://webradio.666soundsdesign-broadcaster.com
```

Mit Slash:

```text
https://webradio.666soundsdesign-broadcaster.com/
```

---

## 26.2 Domain-Stream über Worker

Hauptstream über eigene Domain:

```text
https://webradio.666soundsdesign-broadcaster.com/stream
```

Backup-/Fallback-Stream über eigene Domain:

```text
https://webradio.666soundsdesign-broadcaster.com/fallback-stream
```

NowPlaying / Metadaten über eigene Domain:

```text
https://webradio.666soundsdesign-broadcaster.com/api/nowplaying
```

Healthcheck:

```text
https://webradio.666soundsdesign-broadcaster.com/health
```

Interner Player:

```text
https://webradio.666soundsdesign-broadcaster.com/internal
```

Externer Player über Worker:

```text
https://webradio.666soundsdesign-broadcaster.com/extern
```

Dashboard-Ziel:

```text
https://webradio.666soundsdesign-broadcaster.com/dashboard
```

---

## 26.3 MyIDJ / SonicPanel Stream-Adressen

Primary Upstream / Hauptstream beim Provider:

```text
https://my.idjstream.com/666soundsdesign/stream
```

Primary Upstream ohne Slash-Stream-Endung / Basis-Mount:

```text
https://my.idjstream.com/666soundsdesign
```

Fallback / Port-Stream:

```text
https://my.idjstream.com:8686/stream
```

Fallback / Port-Basis ohne Slash-Stream:

```text
https://my.idjstream.com:8686
```

Metadaten / SonicPanel Info:

```text
https://my.idjstream.com/cp/get_info.php?p=8686
```

Provider / SonicPanel Kontext:

```text
MyIDJ / SonicPanel
Port: 8686
Stream-Mount: 666soundsdesign
```

---

## 26.4 TuneIn

TuneIn-Seite:

```text
https://tunein.com/radio/s357001
```

---

## 26.5 GitHub Pages Player

GitHub Pages externer Player:

```text
https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/external-player/
```

GitHub Pages Repo-Basis:

```text
https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/
```

---

## 26.6 GitHub Repo

Repo-Webseite:

```text
https://github.com/xfraggelpower666x/WebRadio-666SOUNDsDESIGn
```

Branch:

```text
WebRadio-666SOUNDsDESIGn
```

Owner:

```text
xfraggelpower666x
```

Repo:

```text
WebRadio-666SOUNDsDESIGn
```

---

## 26.7 Discord-Shooter URLs über Radio-Domain

Status:

```text
https://webradio.666soundsdesign-broadcaster.com/api/discord/status
```

Debug:

```text
https://webradio.666soundsdesign-broadcaster.com/api/discord/debug
```

Manual Broadcast:

```text
https://webradio.666soundsdesign-broadcaster.com/api/discord/manual
```

Share:

```text
https://webradio.666soundsdesign-broadcaster.com/api/discord/share
```

Message:

```text
https://webradio.666soundsdesign-broadcaster.com/api/discord/message
```

NowPlaying:

```text
https://webradio.666soundsdesign-broadcaster.com/api/discord/nowplaying
```

---

## 26.8 Player Alert / Broadcast URLs

Status:

```text
https://webradio.666soundsdesign-broadcaster.com/api/player-alert/status
```

Current:

```text
https://webradio.666soundsdesign-broadcaster.com/api/player-alert/current
```

History:

```text
https://webradio.666soundsdesign-broadcaster.com/api/player-alert/history
```

Send:

```text
https://webradio.666soundsdesign-broadcaster.com/api/player-alert/send
```

---

## 26.9 Sound / Brand Namen

Diese Namen gehören zur Radio-/Bot-/Dashboard-Kommunikation und dürfen nicht eigenmächtig ersetzt werden:

```text
666SOUNDsDESIGn
666SOUNDsDESIGn WebRadio
666 RadioBotAI
Discord RadioCoreBot
FraggelPower666
FRAGGELPOWER666
Broadcaster 666
Cyberstream Cockpit
```

Zusätzliche Schreib-/Suchformen, falls in alten Dateien oder externen Quellen vorhanden:

```text
666soundsdesign
soundsdesign
sound666
Sound666
SoundsDesign
666 Sounds Design
```

Wichtig:

```text
Brand-Namen nicht eigenmächtig glätten.
Nicht aus 666SOUNDsDESIGn automatisch 666 Sounds Design machen, außer es wird ausdrücklich für eine externe Anzeige benötigt.
```

---

## 26.10 ENV-URL-Mapping

Diese Werte gehören in `.env.example`, Bot-Konfig, Dashboard-Konfig oder Worker-Konfig als Platzhalter bzw. öffentliche URL-Werte.

```env
PUBLIC_RADIO_DOMAIN=https://webradio.666soundsdesign-broadcaster.com
PUBLIC_RADIO_DOMAIN_SLASH=https://webradio.666soundsdesign-broadcaster.com/

RADIO_DOMAIN_STREAM_URL=https://webradio.666soundsdesign-broadcaster.com/stream
RADIO_DOMAIN_BACKUP_STREAM_URL=https://webradio.666soundsdesign-broadcaster.com/fallback-stream
RADIO_DOMAIN_NOWPLAYING_URL=https://webradio.666soundsdesign-broadcaster.com/api/nowplaying
RADIO_DOMAIN_HEALTH_URL=https://webradio.666soundsdesign-broadcaster.com/health

MYIDJ_PRIMARY_STREAM_URL=https://my.idjstream.com/666soundsdesign/stream
MYIDJ_PRIMARY_BASE_URL=https://my.idjstream.com/666soundsdesign
MYIDJ_FALLBACK_STREAM_URL=https://my.idjstream.com:8686/stream
MYIDJ_FALLBACK_BASE_URL=https://my.idjstream.com:8686
MYIDJ_METADATA_URL=https://my.idjstream.com/cp/get_info.php?p=8686

TUNEIN_URL=https://tunein.com/radio/s357001

GITHUB_PAGES_PLAYER_URL=https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/external-player/
GITHUB_PAGES_REPO_URL=https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/
GITHUB_REPO_URL=https://github.com/xfraggelpower666x/WebRadio-666SOUNDsDESIGn

DASHBOARD_PUBLIC_URL=https://webradio.666soundsdesign-broadcaster.com/dashboard
```

---

# 27. STREAM-URL-PRIORITÄT

Für Player, Bot und Dashboard gilt diese Reihenfolge:

```text
1. RADIO_DOMAIN_STREAM_URL
   https://webradio.666soundsdesign-broadcaster.com/stream

2. RADIO_DOMAIN_BACKUP_STREAM_URL
   https://webradio.666soundsdesign-broadcaster.com/fallback-stream

3. MYIDJ_PRIMARY_STREAM_URL
   https://my.idjstream.com/666soundsdesign/stream

4. MYIDJ_FALLBACK_STREAM_URL
   https://my.idjstream.com:8686/stream
```

Grund:

```text
Die eigene Domain / der Worker bleibt der zentrale Zugriffspunkt.
Provider-URLs bleiben als Upstream/Fallback dokumentiert.
```


# 25. MASTER-SATZ

Eine Repo.
Ein Branch.
Ein zentraler Worker.
Ein bestehender Discord-Shooter.
Ein später integrierter 666 RadioBotAI.
Ein separates öffentliches Dashboard-Menü.
Eine finale uploadbare Gesamt-ZIP.

Keine parallelen Uploads.
Keine zweiten Systeme neben dem bestehenden Radio.
Keine Secrets öffentlich.
