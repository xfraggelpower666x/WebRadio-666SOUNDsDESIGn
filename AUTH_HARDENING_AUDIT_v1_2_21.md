# WebRadio 666SOUNDsDESIGn — PW/Auth Hardening Audit v1.2.21

## Basis

- Ausgangsstand: v1.2.20
- Zielstand: v1.2.21
- Release: `FULLVERSION_PW_AUTH_HARDENING_v1.2.21`

## Umgesetzt

1. `PW_LOGIN_URL` zeigt verbindlich auf den Passwort-Worker `/login`.
2. `AUTH_AUDIENCE=666SOUNDsDESIGn-WebRadio-Admin` ist verbindlicher Tokenbestandteil.
3. Passwort-Worker schreibt `aud`; Auth-Worker und WebRadio-Broker prüfen `aud` fail-closed.
4. `ADMIN_SERVICE_TOKEN` ist für Passwort-Worker und Auth-Worker verpflichtend.
5. Fehlender Service-Token liefert `service_token_missing`; falscher Token `service_auth_rejected`.
6. Passwort-Worker besitzt serverseitiges Rate-Limit pro Cloudflare-IP:
   - maximal 5 Fehlversuche
   - danach 15 Minuten Sperre
   - erfolgreiche Anmeldung löscht den Zähler
7. Tokenlaufzeit wurde von 8 Stunden auf 2 Stunden reduziert.
8. Frontend-Fehlermeldungen für Audience, Service-Authentifizierung und Rate-Limit ergänzt.
9. Root-/Public- sowie Worker-Spiegel synchronisiert.

## Nicht verändert

- Admin-Passwort oder sonstige Secrets
- Audio-, Player- oder Layoutarchitektur
- Discord- und Messaging-Routen
- GitHub-Konfigurationslogik

## Deploy-Reihenfolge

1. In Passwort-Worker und Auth-Worker identische Secrets setzen:
   - `AUTH_SECRET`
   - `ADMIN_SERVICE_TOKEN`
   - `AUTH_AUDIENCE=666SOUNDsDESIGn-WebRadio-Admin`
2. Im Passwort-Worker zusätzlich `ADMIN_PASSWORD` setzen.
3. Passwort-Worker v1.2.1 deployen.
4. Auth-Worker v1.2.1 deployen.
5. Im WebRadio-Worker setzen:
   - `PW_LOGIN_URL=https://666-system-pw.666soundsdesign-broadcaster.com/login`
   - `ADMIN_AUTH_VERIFY_URL=https://666-system-auth.666soundsdesign-broadcaster.com/verify`
   - identischen `ADMIN_SERVICE_TOKEN`
   - identische `AUTH_AUDIENCE`
6. WebRadio v1.2.21 deployen.
7. Live-Test: Login → Gate-Check → Discord/Skip/Messaging.

## Verifikation

- `npm run check`: PASS
- Node Tests: 53 / 53 PASS
- JavaScript-Syntax: 124 Dateien PASS
- Root/Public-Spiegel: 63 PASS
- Nested ZIPs: 0

## Status

`RE-AUDIT PASS / DEPLOYMENT READY`

Ein Live-Freeze ist erst nach erfolgreichem Test aller drei produktiven Worker zulässig.
