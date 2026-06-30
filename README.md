# 666SOUNDsDESIGn WebRadio — FULLVERSION AUTH HARDLOCK REPAIR v1.1.0

**Release:** 30. Juni 2026  
**Status:** reparierte, lokal geprüfte Repo-Vollversion mit kanonischer Passwort-Worker/Auth-Worker-Architektur  
**Repo:** `xfraggelpower666x/WebRadio-666SOUNDsDESIGn`  
**Produktivbranch:** `WebRadio-666SOUNDsDESIGn`

## Release-Ziel

Diese Version erhält den bestehenden WebRadio-Player, Worker, Notfallplayer, Skip-, Discord-, Broadcast-, Admin-, Dashboard- und Scriptable-Bestand. Die Reparatur konzentriert die menschliche Admin-Authentifizierung auf genau eine Kette:

```text
Browser
→ Same-Origin WebRadio-Worker /api/admin/login
→ Passwort-Worker POST /login
→ signiertes Admin-Token
→ Auth-Worker POST /verify
→ WebRadio-Worker requireStrictAdmin()
→ geschützte Adminaktion
```

Kanonische Worker:

```text
Passwort-Worker:
https://666-system-pw.666soundsdesign-broadcaster.com/login

Auth-Worker:
https://666-system-auth.666soundsdesign-broadcaster.com/verify
```

Der Browser verwendet ausschließlich:

```javascript
window.S666AdminAuth.login()
window.S666AdminAuth.check()
window.S666AdminAuth.fetch()
```

Das Token liegt nur in `sessionStorage` beziehungsweise im Arbeitsspeicher. Das Passwort wird nach dem Login nicht an Skip-, Discord-, Preset- oder Config-Routen gesendet.

## Sicherheits-Hardlocks

- kein `/login` am Auth-Worker
- kein `x-admin-password` im Runtime-Code
- kein Browser-Bearer-Token an fremde Origins
- kein Healthcheck als Authentifizierung
- keine festen Gate-Fallback-Hashes
- keine parallelen Browser-Auth-Clients
- Browser-Schreibaktionen nur mit erlaubter Origin
- Service-zu-Service ohne Browser-Origin nur mit `x-service-token`
- alle geschützten Routen verwenden `requireStrictAdmin()`
- Autorisierung arbeitet fail closed

Details: `docs/AUTH_ARCHITECTURE_CANONICAL_v1_0_0.md`

## Geschützte Funktionen

Mindestens folgende Routen sind an dieselbe strikte Prüfung gebunden:

```text
/api/admin/config/current
/api/admin/config/backups
/api/admin/config/update
/api/admin/config/rollback
/api/admin/skip
/api/admin/debug
/api/admin/services/health
/api/discord/manual
/api/discord/share
/api/discord/message
/api/discord/test
/api/discord/nowplaying
/api/discord/debug
```

`/api/discord/status`, `/health` und reine öffentliche Lesefunktionen bleiben ohne Adminfreigabe erreichbar, dürfen aber niemals als Authentifizierungsnachweis gelten.

## Cloudflare-Konfiguration

Der WebRadio-Worker benötigt das Secret:

```text
ADMIN_SERVICE_TOKEN
```

und die Variablen:

```text
ADMIN_AUTH_LOGIN_URL=https://666-system-pw.666soundsdesign-broadcaster.com/login
ADMIN_AUTH_VERIFY_URL=https://666-system-auth.666soundsdesign-broadcaster.com/verify
ADMIN_SERVICE_ORIGIN=https://webradio.666soundsdesign-broadcaster.com
AUTH_AUDIENCE=666SOUNDsDESIGn-WebRadio-Admin
AUTH_MODE=external_auth_worker
```

Secret-Parität:

```text
AUTH_SECRET
→ Passwort-Worker und Auth-Worker identisch

ADMIN_SERVICE_TOKEN
→ WebRadio-, Passwort- und Auth-Worker identisch

ADMIN_PASSWORD
→ ausschließlich Passwort-Worker

AUTH_AUDIENCE
→ alle drei Worker identisch
```

Echte Secret-Werte gehören nicht in Repository oder ZIP.

## Deploy-Struktur

Die Deploy-ZIP ist ein Safe Root Package. Nach dem Entpacken liegen direkt im gewählten Ordner unter anderem:

```text
index.html
worker.js
wrangler.jsonc
package.json
public/
worker-addons/
workers/
Scriptable/
assets/
config/
css/
js/
docs/
```

Nicht enthalten:

```text
.git/
.wrangler/
innere ZIP-Dateien
__MACOSX/
._*
Python-Bytecode
lokale Secrets
```

## Scriptable-Upload

1. Deploy-ZIP in der Dateien-App entpacken.
2. `Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js` in Scriptable öffnen.
3. Owner, Repo und Branch auf die produktiven Werte setzen.
4. atomaren Fullversion-/Root-Replace-Modus verwenden.
5. den Ordner auswählen, in dem `index.html` und `worker.js` direkt liegen.
6. Löschvorschau prüfen und erst dann bestätigen.

## Lokale Prüfung

```bash
npm ci
npm run verify
```

`npm run verify` prüft Release-Struktur, Mirrors, JavaScript-Syntax, verbotene Legacy-Authmarker und die lokalen Worker-/Auth-Vertragstests.

## Wahrheitsgrenze

Die Repo-Version wurde lokal und mit simulierten Worker-Verträgen geprüft. Nicht vorgetäuscht wurden:

- produktive Cloudflare-Secrets
- reale Live-Antworten der Passwort- und Auth-Worker
- DNS/Custom-Domain-Zustand
- GitHub-/KV-/Render-/SonicPanel-/SHOUTcast-Zugangsdaten
- echter Live-Deploy

Vor Produktionsfreigabe müssen die End-to-End-Tests aus dem kanonischen Auth-Handoff gegen die realen Worker ausgeführt werden.
