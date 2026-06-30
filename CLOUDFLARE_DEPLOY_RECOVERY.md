# Cloudflare Branch-, Deploy- und Auth-Recovery — v1.1.0

## Zielzustand WebRadio

| Einstellung | Wert |
|---|---|
| GitHub Repository | `xfraggelpower666x/WebRadio-666SOUNDsDESIGn` |
| Production branch | `WebRadio-666SOUNDsDESIGn` |
| Worker name | `webradio-666soundsdesign-worker` |
| Root directory — bevorzugt | `/` beziehungsweise leer |
| Root directory — Legacy kompatibel | `workers/webradio-666soundsdesign-worker` |
| Build command | `npm run verify` oder leer |
| Deploy command | `npx wrangler deploy` |
| Asset directory | `./public` |

## Bestehende Auth-Worker nicht löschen oder umbenennen

```text
Passwort-Worker:
666-system-pw-worker
https://666-system-pw.666soundsdesign-broadcaster.com
GET /health
POST /login

Auth-Worker:
666-system-auth-worker
https://666-system-auth.666soundsdesign-broadcaster.com
GET /health
POST /verify
KEIN /login
```

## WebRadio-Worker: Variablen

```text
ADMIN_AUTH_LOGIN_URL=https://666-system-pw.666soundsdesign-broadcaster.com/login
ADMIN_AUTH_VERIFY_URL=https://666-system-auth.666soundsdesign-broadcaster.com/verify
ADMIN_SERVICE_ORIGIN=https://webradio.666soundsdesign-broadcaster.com
AUTH_AUDIENCE=666SOUNDsDESIGn-WebRadio-Admin
AUTH_MODE=external_auth_worker
RELEASE_VERSION=FULLVERSION_AUTH_HARDLOCK_REPAIR_v1.1.0
```

## WebRadio-Worker: Secrets

```text
ADMIN_SERVICE_TOKEN
GITHUB_TOKEN
PLAYER_ALERT_SERVICE_TOKEN
SHOUTCAST_ADMIN_PASSWORD oder entsprechendes Skip-Provider-Secret
optional DEBUG_TOKEN
```

Zusätzliche normale Variablen für GitHub-/Skip-/Backend-Routing bleiben gemäß `.dev.vars.example` und `wrangler.jsonc` erforderlich.

## Secret-Parität

```text
AUTH_SECRET
→ im Passwort-Worker und Auth-Worker exakt identisch

ADMIN_SERVICE_TOKEN
→ im WebRadio-, Passwort- und Auth-Worker exakt identisch

ADMIN_PASSWORD
→ ausschließlich im Passwort-Worker

AUTH_AUDIENCE
→ in allen drei Workern exakt identisch
```

Nicht verwechseln:

```text
ADMIN_PASSWORD
AUTH_SECRET
ADMIN_SERVICE_TOKEN
Discord-Bot-Token
DISCORD_ADMIN_TOKEN
RADIO_ADMIN_WORKER_TOKEN
```

## Branch-Recovery

1. Cloudflare → Workers & Pages → `webradio-666soundsdesign-worker` öffnen.
2. Settings → Build → Branch control.
3. Production branch auf `WebRadio-666SOUNDsDESIGn` setzen.
4. Root directory prüfen: bevorzugt leer beziehungsweise `/`.
5. Deploy command auf `npx wrangler deploy` setzen.
6. WebRadio-Variablen und Secrets prüfen.
7. Passwort-Worker `/login` und Auth-Worker `/verify` separat über `/health` auf Erreichbarkeit prüfen.
8. Beachten: `/health` bestätigt nur Erreichbarkeit, niemals Authentifizierung.
9. atomaren Scriptable-Upload beziehungsweise einen einzelnen vollständigen Commit ausführen.
10. anschließend End-to-End-Auth-Tests durchführen.

## Legacy-Build-Root

Bei altem Root `workers/webradio-666soundsdesign-worker` werden Worker, Add-ons, Paket- und Wrangler-Datei gespiegelt. Die kanonische Bearbeitungsquelle bleibt der Repo-Root. Der Release-Checker blockiert bei Mirror-Drift.

## Pflicht-End-to-End-Tests

```text
[ ] korrektes Passwort erzeugt ein Token
[ ] falsches Passwort wird abgelehnt
[ ] Token läuft nach acht Stunden ab
[ ] falsche Signatur / Issuer / Scope / Audience werden abgelehnt
[ ] abgelaufenes Token wird abgelehnt
[ ] fehlender Bearer-Header wird abgelehnt
[ ] falscher ADMIN_SERVICE_TOKEN wird abgelehnt
[ ] falsche oder fehlende Browser-Origin bei Schreibrequest wird abgelehnt
[ ] /health wird nicht als Auth akzeptiert
[ ] Auth-Worker besitzt keine /login-Route
[ ] Passwort wird nicht an Skip oder Discord weitergegeben
[ ] Config-, Skip- und Discord-Schreibrouten verwenden requireStrictAdmin
[ ] Browser verwendet ausschließlich window.S666AdminAuth
[ ] keine Secrets erscheinen in Repo, Logs oder Debugantworten
```

## Rollback

Bei einem Auth-Fehler nicht auf die verbotene Legacy-Authentifizierung zurückschalten. Stattdessen:

1. aktuellen Build stoppen beziehungsweise vorherigen geprüften Release aktivieren,
2. Variablen-/Secret-Parität prüfen,
3. Passwort-Worker `/login` und Auth-Worker `/verify` einzeln prüfen,
4. Issuer, Scope, Audience und Unix-Sekunden für `exp`/`expiresAt` vergleichen,
5. WebRadio-Worker erneut deployen,
6. komplette Pflicht-Testmatrix wiederholen.
