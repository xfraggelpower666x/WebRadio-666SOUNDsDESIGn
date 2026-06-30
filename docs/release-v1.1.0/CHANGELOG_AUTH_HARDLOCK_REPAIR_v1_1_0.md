# Changelog — Auth Hardlock Repair v1.1.0

## Authentifizierung

- zentralen Browser-Client `window.S666AdminAuth` ergänzt
- Token ausschließlich in `sessionStorage` beziehungsweise Arbeitsspeicher
- Same-Origin-Login über `/api/admin/login`
- Passwort nur serverseitig an den Passwort-Worker `/login`
- neu ausgestelltes Token sofort über Auth-Worker `/verify` validiert
- `iss`, `scope`, `exp` und Audience strikt geprüft
- `ADMIN_SERVICE_TOKEN` für Worker-zu-Worker-Aufrufe ergänzt
- Browser-Schreibaktionen ohne erlaubte Origin fail closed
- Service-Schreibaktionen ohne Browser-Origin nur mit gültigem `x-service-token`
- Config-, Skip-, Discord-Schreib-/Test-/Debug-Routen auf `requireStrictAdmin()` vereinheitlicht
- Legacy-Header `x-admin-password`, Discord-Gate-Code und feste Fallback-Hashes aus Runtime entfernt
- direkte Browseraufrufe zu den Auth-Worker-Domains entfernt

## Renderer / Alert Service

- direkten Browser-Passwortupload deaktiviert
- `MASTER_ADMIN_PASSWORD` und `x-admin-password` aus Renderer-Runtime entfernt
- `POST /process` auf Service-zu-Service-Authentifizierung mit `PLAYER_ALERT_SERVICE_TOKEN` umgestellt
- Renderer-Hauptquelle und Spiegel synchronisiert

## Browser und UI

- Player Stage, Admin Overlay und Discord Add-on an denselben Auth-Client gebunden
- parallele Passwort-/Token-Caches entfernt
- Versionsautorität auf `v2026.06.30-auth-hardlock1` vereinheitlicht
- Root- und `public/`-Spiegel synchronisiert

## Worker / Deploy

- kanonische Auth-Variablen in Root- und Legacy-`wrangler.jsonc` ergänzt
- Root-Worker und Legacy-Build-Root bytegleich synchronisiert
- Release-Checker um Auth-Hardlocks, Renderer-Mirrors, JavaScript- und Python-Syntaxprüfung erweitert
- `.git/`, `.wrangler/`, Python-Bytecode, innere ZIPs und lokale Zustände aus Deploy-Paket ausgeschlossen
- historische Handoffs mit falscher Auth-Worker-Login-URL korrigiert und als durch die kanonische Auth-Dokumentation ersetzt markiert

## Tests

- neue Auth-Hardlock-Testmatrix ergänzt
- Renderer-Service-Auth-Test ergänzt
- vorhandene Worker-Smoke-Tests erhalten und aktualisiert
