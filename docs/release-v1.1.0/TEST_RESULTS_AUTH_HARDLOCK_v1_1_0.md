# Testergebnisse — Auth Hardlock Repair v1.1.0

## Paket-/Release-Check

```text
Status:                      PASS
JavaScript-Syntax:           80 / 80 PASS
Python-AST-Syntax:           16 / 16 PASS
Public-Mirror-Paare:         13 / 13 PASS
Legacy-Worker-Mirror-Paare:   4 / 4 PASS
Renderer-Mirror-Paare:        5 / 5 PASS
innere ZIP-Dateien:           0
Python-Bytecode:              0
.git/.wrangler im Deploy:     0
kanonische Auth-Konfiguration: PASS
```

## Node-Testmatrix

```text
Tests:    27 / 27 PASS
Fehler:    0
Skipped:   0
```

Geprüft wurden unter anderem:

- korrektes Passwort → PW-Login → Auth-Verifikation → Tokenrückgabe
- falsches Passwort abgelehnt
- falsche oder fehlende Browser-Origin abgelehnt
- falscher Issuer, Scope, Audience, Ablaufzeit und ungültiges Token abgelehnt
- fehlender Bearer-Header abgelehnt
- `x-admin-password` autorisiert keine Aktion
- Service-zu-Service ohne Origin benötigt den gemeinsamen Service-Token
- Healthcheck ist kein Authentifizierungsnachweis
- Discord Write/Test/Debug verwenden dasselbe strikte Gate
- Skip akzeptiert nur verifiziertes Passwort-Worker-Token
- Renderer-Prozessroute ist nur Service-zu-Service
- unbekannte API-/Asset-Routen liefern echte 404-Antworten
- Root und CSS werden aus dem Asset-Binding geliefert

## Dependency-Prüfung

```text
npm ci:          PASS
Pakete geprüft:  1
Vulnerabilities: 0
```

## Noch erforderliche Live-Tests

Die Tests simulieren die externen Auth-Worker-Verträge. Vor Live-Freigabe müssen dieselben Fälle gegen die produktiven Domains mit realen Cloudflare-Secrets wiederholt werden.
