# 666SOUNDsDESIGn · Passwort-Worker / Auth-Worker Handoff

**Version:** v1.0.0  
**Datum:** 2026-06-30  
**Status:** CANONICAL AUTH ARCHITECTURE / HARDLOCK  
**System:** WebRadio-666SOUNDsDESIGn  
**Zweck:** Zentraler Admin-Login und Schutz aller administrativen Radiofunktionen

## 1. Architektur

```text
Passwort-Worker = Passwort prüfen und Token ausstellen
Auth-Worker     = ausgestelltes Token prüfen
WebRadio-Worker = Login vermitteln und geschützte Routen absichern
Browser         = genau einen zentralen Auth-Client verwenden
```

### Passwort-Worker

```text
Worker: 666-system-pw-worker
Domain: https://666-system-pw.666soundsdesign-broadcaster.com
Routen: GET /health, POST /login
```

Der Passwort-Worker nimmt das menschliche Admin-Passwort entgegen, vergleicht es mit `ADMIN_PASSWORD` und erzeugt bei Erfolg ein signiertes Token mit:

```text
iss   = 666-system-pw
scope = admin
exp   = Ablaufzeit in Unix-Sekunden
TTL   = 28800 Sekunden / 8 Stunden
aud    = AUTH_AUDIENCE
```

### Auth-Worker

```text
Worker: 666-system-auth-worker
Domain: https://666-system-auth.666soundsdesign-broadcaster.com
Routen: GET /health, POST /verify
```

Der Auth-Worker prüft Signatur, Issuer, Scope, Ablaufzeit und Audience. Er besitzt keine `/login`-Route.

## 2. Login-Ablauf

1. Browser sendet das Passwort ausschließlich an `POST /api/admin/login` des WebRadio-Workers.
2. WebRadio-Worker sendet es serverseitig an `POST https://666-system-pw.666soundsdesign-broadcaster.com/login`.
3. Passwort-Worker stellt bei Erfolg ein Token aus.
4. WebRadio-Worker prüft dieses Token sofort über `POST https://666-system-auth.666soundsdesign-broadcaster.com/verify`.
5. Nur ein vollständig bestätigtes Token wird an den Browser zurückgegeben.
6. Browser speichert es nur in `sessionStorage` oder im Arbeitsspeicher.
7. Jede geschützte Aktion verwendet `Authorization: Bearer <Token>`.
8. WebRadio-Worker verifiziert das Token für jede administrative Aktion erneut beim Auth-Worker.

Das Passwort wird nach dem Login nicht an Skip-, Discord-, Preset- oder Config-Routen geschickt.

## 3. Worker-Verträge

### Passwort-Worker Login

```http
POST /login
Content-Type: application/json
Origin: https://webradio.666soundsdesign-broadcaster.com
x-service-token: <ADMIN_SERVICE_TOKEN>
x-auth-audience: <AUTH_AUDIENCE>
```

```json
{
  "password": "<NUTZEREINGABE>",
  "audience": "<AUTH_AUDIENCE>",
  "source": "webradio-admin-login"
}
```

Erfolg:

```json
{
  "ok": true,
  "token": "<SIGNIERTES_ADMIN_TOKEN>",
  "expiresAt": 0,
  "scope": "admin",
  "issuer": "666-system-pw"
}
```

### Auth-Worker Verify

```http
POST /verify
Content-Type: application/json
Authorization: Bearer <SIGNIERTES_ADMIN_TOKEN>
Origin: https://webradio.666soundsdesign-broadcaster.com
x-service-token: <ADMIN_SERVICE_TOKEN>
x-auth-audience: <AUTH_AUDIENCE>
```

```json
{
  "audience": "<AUTH_AUDIENCE>",
  "source": "webradio-auth-check"
}
```

Erfolg:

```json
{
  "ok": true,
  "valid": true,
  "payload": {
    "iss": "666-system-pw",
    "scope": "admin",
    "exp": 0,
    "aud": "666SOUNDsDESIGn-WebRadio-Admin"
  }
}
```

## 4. Konfiguration

### Passwort-Worker Secrets

```text
ADMIN_PASSWORD
AUTH_SECRET
ADMIN_SERVICE_TOKEN
```

### Passwort-Worker Variables

```text
ALLOWED_ORIGIN=https://webradio.666soundsdesign-broadcaster.com
AUTH_AUDIENCE=666SOUNDsDESIGn-WebRadio-Admin
TOKEN_TTL_SECONDS=28800
```

### Auth-Worker Secrets

```text
AUTH_SECRET
ADMIN_SERVICE_TOKEN
```

### Auth-Worker Variables

```text
ALLOWED_ORIGIN=https://webradio.666soundsdesign-broadcaster.com
AUTH_AUDIENCE=666SOUNDsDESIGn-WebRadio-Admin
```

### WebRadio-Worker Secret

```text
ADMIN_SERVICE_TOKEN
```

### WebRadio-Worker Variables

```text
ADMIN_AUTH_LOGIN_URL=https://666-system-pw.666soundsdesign-broadcaster.com/login
ADMIN_AUTH_VERIFY_URL=https://666-system-auth.666soundsdesign-broadcaster.com/verify
ADMIN_SERVICE_ORIGIN=https://webradio.666soundsdesign-broadcaster.com
AUTH_AUDIENCE=666SOUNDsDESIGn-WebRadio-Admin
AUTH_MODE=external_auth_worker
```

### Parität

```text
AUTH_SECRET         -> Passwort-Worker und Auth-Worker identisch
ADMIN_SERVICE_TOKEN -> WebRadio-, Passwort- und Auth-Worker identisch
ADMIN_PASSWORD      -> ausschließlich Passwort-Worker
AUTH_AUDIENCE       -> alle drei Worker identisch
```

`ADMIN_PASSWORD`, `AUTH_SECRET`, `ADMIN_SERVICE_TOKEN`, Discord-Bot-Token, `DISCORD_ADMIN_TOKEN` und `RADIO_ADMIN_WORKER_TOKEN` sind strikt getrennte Werte.

## 5. Browser-Hardlock

Es existiert genau eine Browser-Authentifizierungsinstanz:

```javascript
window.S666AdminAuth.login()
window.S666AdminAuth.check()
window.S666AdminAuth.fetch()
```

Regeln:

- Token nur in `sessionStorage` oder RAM.
- Kein `localStorage` für Auth-Tokens.
- Kein zweiter Passwortcache.
- Kein separater Auth-Client in einem Overlay.
- Kein Passwort direkt an Skip oder Discord.
- Kein Bearer-Token an fremde Origins.
- Browser-Requests immer same-origin zum WebRadio-Worker.

## 6. Strict Admin Gate

Eine administrative Aktion wird nur ausgeführt, wenn alle Bedingungen erfüllt sind:

```text
Bearer-Token vorhanden
Token vom Auth-Worker bestätigt
iss === 666-system-pw
scope === admin
exp noch gültig
AUTH_AUDIENCE stimmt
Same-Origin-Nachweis oder gültige Service-Authentifizierung vorhanden
```

Fehlt eine Bedingung:

```text
DENY
HTTP 401 oder 403
keine Aktion
kein Fallback
```

## 7. Origin- und Service-Regeln

Browser-Schreibaktionen müssen die exakte Origin besitzen:

```text
https://webradio.666soundsdesign-broadcaster.com
```

Fehlen bei einem Browser-Schreibrequest sowohl `Origin` als auch `Referer`, wird er abgelehnt.

Service-zu-Service ohne Browser-Origin ist nur mit gültigem Header erlaubt:

```http
x-service-token: <ADMIN_SERVICE_TOKEN>
```

## 8. Geschützte Routen

Mindestens:

```text
/api/admin/config/current
/api/admin/config/backups
/api/admin/config/update
/api/admin/config/rollback
/api/admin/skip
```

Zusätzlich:

```text
Discord write/test/debug
Preset-Schreibfunktionen
Auto-DJ-Skip
Playlist-Wechsel
sonstige administrative POST-, PUT-, PATCH- und DELETE-Routen
```

## 9. Verbotene Legacy-Wege

```text
Auth-Worker /login
AUTH_LOGIN_URL mit Auth-Worker-Domain
x-admin-password
Passwort direkt an /api/admin/skip
Passwort direkt an Discord-Routen
Healthcheck als Authentifizierung
öffentlicher Gate-Fallback-Hash
parallele Gate-/Passwort-Caches
mehrere Browser-Auth-Clients
Bearer-Token an fremde Origins
```

`/health` bedeutet ausschließlich Erreichbarkeit, niemals Anmeldung oder Autorisierung.

## 10. Sichere Fehlercodes

```text
password_rejected
origin_rejected
token_invalid
token_expired
token_verification_failed
pw_login_unreachable
auth_verify_unreachable
service_auth_rejected
audience_rejected
scope_rejected
issuer_rejected
```

Niemals ausgeben oder protokollieren:

```text
Passwortwert
Tokenwert
AUTH_SECRET
ADMIN_SERVICE_TOKEN
vollständiger Authorization-Header
Cloudflare-Secret-Werte
interne Stacktraces im Browser
```

## 11. Pflicht-Tests

- korrektes Passwort erzeugt Token
- falsches Passwort wird abgelehnt
- TTL acht Stunden
- falsche Signatur/Issuer/Scope/Audience/Ablaufzeit werden abgelehnt
- fehlender Bearer wird abgelehnt
- falscher Service-Token wird abgelehnt
- falsche Origin wird abgelehnt
- Browser-Schreibrequest ohne Origin wird abgelehnt
- Health wird nicht als Auth akzeptiert
- Passwort geht nicht an Skip oder Discord
- Config/Skip/Discord verwenden dieselbe Strict-Admin-Prüfung
- Browser verwendet ausschließlich `window.S666AdminAuth`
- `x-admin-password` existiert nicht im Runtime-Code
- keine Secrets im Repository oder in Logs

## 12. Endentscheidung

```text
PASSWORT-WORKER = LOGIN UND TOKEN-AUSSTELLER
AUTH-WORKER     = TOKEN-PRÜFER
WEBRADIO-WORKER = SAME-ORIGIN BROKER UND ROUTEN-GATE
BROWSER         = EIN AUTH-CLIENT / BEARER / SESSION-ONLY

KEIN PASSWORT IN FUNKTIONSROUTEN.
KEIN LOGIN AM AUTH-WORKER.
KEIN HEALTHCHECK ALS AUTORISIERUNG.
KEINE ADMIN-AKTION OHNE STRICT ADMIN CHECK.
FAIL CLOSED.
```
