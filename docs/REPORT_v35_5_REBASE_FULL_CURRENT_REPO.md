# 666SOUNDsDESIGn Player — v35.5 Rebase Full Current Repo

**Projekt:** WebRadio-666SOUNDsDESIGn  
**Dokumenttyp:** Rebase-/Build-Report  
**Version:** v35.5.0  
**Erstellt am:** 2026-06-04  
**Owner:** xfraggelpower666x  
**Repo:** WebRadio-666SOUNDsDESIGn  
**Branch:** Codex / aktuelle hochgeladene Repo-ZIP  
**Arbeitsmodus:** Lokaler Repo-ZIP-Build  
**Status:** PASS nach Syntax-/ZIP-Prüfung  
**Secrets:** Keine Secrets/Tokens in diesem Dokument.

## Quelle

Basis war die neu hochgeladene vollständige Repo-ZIP:

`WebRadio-666SOUNDsDESIGn-WebRadio-666SOUNDsDESIGn (1).zip`

Diese Basis enthält 473 Dateien und die geschützte DarkDancer-Struktur.

## Schutzentscheidungen

- `666SOUNDsDESIGn/The-Dark-Dancer.html` bleibt erhalten.
- `666SOUNDsDESIGn/the-dark-dancer-header-source.jpeg` bleibt erhalten.
- `config/radio-runtime.json` behält `darkDancerUrl`.
- `worker.js` wurde nicht geändert.
- Discord Shooter / Private Track Shooter / Message Backend / Admin Routes wurden nicht ersetzt.

## Integrierte v35.5-Änderungen

1. Version-Core auf `v35.5.0` aktualisiert.
2. Cache-Burst-ID auf `v35.5.0-2026-06-04-rebased-full-current-repo` aktualisiert.
3. `js/version-state-guard-v1.js` als harter sichtbarer Versionsguard aktualisiert.
4. `config/player-version.json` und `config/player-version.js` ergänzt.
5. `js/equalizer.js` rekursiven `v27StableMapping`-Fehler repariert.
6. `js/stream-watchdog-v1.js` als Diagnose-Layer ergänzt, ohne Recovery zu ersetzen.
7. `css/stream-watchdog-v1.css` ergänzt.
8. `js/ticker-stability-v1.js` ergänzt, ohne Metadaten-/Worker-Routen zu ändern.
9. `css/ticker-stability-v1.css` ergänzt.
10. `js/message-route-guard-v1.js` ergänzt, ohne bestehendes Message-System zu ersetzen.
11. `index.html` mit neuen lokalen Cache-Bust-Referenzen und v35.5-Version aktualisiert.
12. `js/player-core.js` Import-Cache-Busts aktualisiert.

## Nicht geändert

- Worker-Code
- Worker-Addons
- Secrets
- Cloudflare-Konfiguration
- Discord Voice Bot Repo
- DarkDancer-Dateien

## Deploy-Hinweis

Dieser Build ersetzt die fehlerhafte 13-MB/v35.4-Linie als Basis. Ab jetzt nur noch auf diesem v35.5-Full-Repo-Build weiterarbeiten.
