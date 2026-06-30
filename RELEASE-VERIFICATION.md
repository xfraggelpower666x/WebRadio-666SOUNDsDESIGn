# Release Verification — FULLVERSION AUTH HARDLOCK REPAIR v1.1.0

## Paketform

- Repo-Dateien direkt im Deploy-ZIP-Root
- keine Wrapper-Ebene
- keine inneren ZIP-Dateien
- kein `.git/` oder `.wrangler/`
- kein `node_modules/`, Python-Bytecode, `__MACOSX/`, `._*` oder `.DS_Store`
- Root-, `public/`-, Renderer- und Legacy-Worker-Spiegel geprüft
- Original-Quell-ZIP unverändert im separaten Full-Backup vorgesehen

## Bestandene lokale Prüfungen

| Prüfung | Ergebnis |
|---|---:|
| Release-/Strukturcheck | PASS |
| JavaScript-Syntax | 80/80 PASS |
| Python-AST-Syntax | 16/16 PASS |
| Node-Tests | 27/27 PASS |
| Public-Mirror-Paare | 13/13 PASS |
| Legacy-Worker-Mirror-Paare | 4/4 PASS |
| Renderer-Mirror-Paare | 5/5 PASS |
| npm-Abhängigkeiten | 0 Vulnerabilities |
| innere ZIP-Dateien | 0 |
| `.git`/`.wrangler` im Deploy | 0 |
| Python-Bytecode | 0 |
| offensichtliche echte Secret-Muster | 0 Treffer |

## Auth-Hardlock

```text
PASSWORT-WORKER = POST /login und Token-Aussteller
AUTH-WORKER     = POST /verify und Token-Prüfer
WEBRADIO-WORKER = Same-Origin-Broker und requireStrictAdmin()
BROWSER         = ein window.S666AdminAuth, Bearer-Token session-only
```

Lokal nachgewiesen:

- Passwort geht nur an den Passwort-Worker-Vertrag.
- neues Token wird sofort durch den Auth-Worker-Vertrag geprüft.
- Issuer, Scope, Audience und Ablaufzeit werden validiert.
- Config, Skip und Discord Write/Test/Debug verwenden denselben strikten Gatekeeper.
- `x-admin-password`, feste Gate-Hashes und Auth-Worker-Login sind aus Runtime entfernt.
- Renderer-Prozessroute ist Service-zu-Service und besitzt keinen Browser-Passwortweg.

## Quellvergleich

```text
Original: 666WebRadio-666SOUNDsDESIGn.zip
SHA256:   0bbcbb292738361162f5e6b945640af5d8a03eb5539fd96182b43a7ef9893271
```

Details: `docs/release-v1.1.0/SOURCE_DIFF.json` und `SOURCE_DIFF.csv`.

## Wahrheitsgrenze

Kein echter Produktiv-Deploy wurde vorgetäuscht. Noch extern zu prüfen:

- Live-Code und Routen des Passwort- und Auth-Workers
- reale Secret-Parität
- achtstündige Tokenlaufzeit
- Cloudflare-Bindings, DNS und Custom Domains
- GitHub-, Render-, Discord-, SHOUTcast-/SonicPanel- und KV-Zugänge
- echte Geräte- und Live-Streamtests

Status: **LOCAL PASS / LIVE END-TO-END REQUIRED**.
