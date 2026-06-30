# Cloudflare Bindings und Secrets — AUTH HARDLOCK v1.1.0

## WebRadio-Worker

### Kanonische Auth-Variablen

```text
ADMIN_AUTH_LOGIN_URL=https://666-system-pw.666soundsdesign-broadcaster.com/login
ADMIN_AUTH_VERIFY_URL=https://666-system-auth.666soundsdesign-broadcaster.com/verify
ADMIN_SERVICE_ORIGIN=https://webradio.666soundsdesign-broadcaster.com
AUTH_AUDIENCE=666SOUNDsDESIGn-WebRadio-Admin
AUTH_MODE=external_auth_worker
```

### Kanonisches Auth-Secret

```text
ADMIN_SERVICE_TOKEN
```

Das Secret muss im WebRadio-, Passwort- und Auth-Worker identisch sein. Es ist nicht das Admin-Passwort, nicht das Signatur-Secret und nicht der Discord-Bot-Token.

### Weitere produktiv relevante Werte

```text
GITHUB_TOKEN
GITHUB_OWNER
GITHUB_REPO
GITHUB_BRANCH
PLAYER_ALERT_SERVICE_TOKEN
PLAYER_ALERT_WRITE_TOKEN optional
SHOUTCAST_ADMIN_URL / alternativer Skip-Provider
SHOUTCAST_ADMIN_USER
SHOUTCAST_ADMIN_PASSWORD / alternatives Provider-Secret
```

Optional:

```text
DEBUG_TOKEN
RADIO_CONFIG_KV
PLAYER_ALERT_KV
```

`ENABLE_PUBLIC_DEBUG` bleibt im Produktivbetrieb `false`.

## Passwort-Worker

Secrets:

```text
ADMIN_PASSWORD
AUTH_SECRET
ADMIN_SERVICE_TOKEN
```

Variablen:

```text
ALLOWED_ORIGIN=https://webradio.666soundsdesign-broadcaster.com
AUTH_AUDIENCE=666SOUNDsDESIGn-WebRadio-Admin
TOKEN_TTL_SECONDS=28800
```

## Auth-Worker

Secrets:

```text
AUTH_SECRET
ADMIN_SERVICE_TOKEN
```

Variablen:

```text
ALLOWED_ORIGIN=https://webradio.666soundsdesign-broadcaster.com
AUTH_AUDIENCE=666SOUNDsDESIGn-WebRadio-Admin
```

Der Auth-Worker stellt keine Login-Route bereit.

## Render Alert Service

```text
PLAYER_ALERT_SERVICE_TOKEN
DATABASE_URL optional
PLAYER_ALERT_DB_PATH
PLAYER_ALERT_TTL_SECONDS
PLAYER_ALERT_MAX_HISTORY
PLAYER_ALERT_RATE_SECONDS
MAX_UPLOAD_MB
FFMPEG_TIMEOUT_SECONDS
```

Der Render-Service besitzt keinen direkten Browser-Passwortweg. `POST /process` ist Service-zu-Service und benötigt `x-player-alert-service-token`.

## Harte Trennung

```text
ADMIN_PASSWORD
AUTH_SECRET
ADMIN_SERVICE_TOKEN
PLAYER_ALERT_SERVICE_TOKEN
Discord-Bot-Token
DISCORD_ADMIN_TOKEN
RADIO_ADMIN_WORKER_TOKEN
```

Diese Werte dürfen nicht gegeneinander wiederverwendet werden. Keine echten Secrets in GitHub, Deploy-ZIP, Full-Backup-Dokumentation, Logs oder Debugantworten speichern.
