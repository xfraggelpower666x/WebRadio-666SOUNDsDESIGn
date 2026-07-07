# 666SOUNDsDESIGn WebRadio — Vergleichsaudit und AMARIS-Reparatur

**Release:** v1.2.1  
**Datum:** 2026-07-02  
**Status:** LOCAL PASS / LIVE DEPLOY NOT PERFORMED  
**Quelle:** `WebRadio-666SOUNDsDESIGn-WebRadio-666SOUNDsDESIGn.zip`  
**Quell-SHA256:** `04f386c0fc7cf9c52ff33e7bf5ed8c2161c20f0f3ae9083046a9ca5f6f6e0b77`

## 1. Wichtigster Befund zum schwarzen Bildschirm

Der schwarze Bildschirm des zuvor vorgeschlagenen Deploys v1.1.1 konnte aus den lokalen Artefakten nicht als einzelner sicherer Codefehler bewiesen werden. Der aktuelle hochgeladene Repo-Stand v1.2.0 zeigt bei einem selbstenthaltenen Chromium-Render sowohl auf Desktop- als auch auf Mobile-Größe sichtbare Player-Oberflächen und keine Inline-JavaScript-Fehler.

Belastbarer Codebefund:

- Der frühere v1.1.1-Stand verwendete `js/admin-auth.js`.
- Der aktuelle Stand verwendet stattdessen `js/admin-auth-client.js` mit `defer` nahe dem Dokumentende.
- Root- und `public/`-Dateien sind im aktuellen Stand gespiegelt.
- 34 vorhandene Tests liefen vor der Reparatur erfolgreich.
- Der aktuelle Quell-Download enthält jedoch genau einen Wrapper-Ordner und ist deshalb nicht direkt als Safe-Root-Deploy geeignet.
- `npm run check` scheiterte ausschließlich an einer fest verdrahteten lokalen Ordnernamenprüfung, obwohl der Repo-Inhalt selbst valide war.

Die frühere Live-Störung bleibt daher am ehesten mit einem Deployment-, Cache-, Asset-Binding- oder unvollständigen Root-Replace vereinbar. Sie wird nicht als bewiesene einzelne Ursache ausgegeben.

## 2. Vergleich: letzter Chat-Hotfix v1.1.1 gegen aktuellen Repo-Stand

- Vorheriger Hotfix: 653 Dateien
- Aktueller Repo-Stand: 729 Dateien
- Hinzugefügt: 88
- Entfernt: 12
- Inhaltlich geändert: 76

Kritische Unterschiede:

- `js/admin-auth.js` und `public/js/admin-auth.js` sind im aktuellen Stand entfernt.
- `js/admin-auth-client.js` und `public/js/admin-auth-client.js` sind vorhanden.
- Externe PW-/Auth-Worker-Quellen sind im aktuellen Repo enthalten.
- Der aktuelle Stand besitzt zusätzliche Hardlock-, Audit- und Worker-Tests.
- Worker-, Frontend-, Player-Alert- und responsive Layer wurden seit v1.1.1 deutlich weiterentwickelt.

## 3. Reparaturen in v1.2.1

1. Neue Repo-Seite `AMARIS/index.html`.
2. Byte-identische Deploy-Spiegeldatei `public/AMARIS/index.html`.
3. Neuer Worker-Endpunkt `/amaris` einschließlich `/amaris/` und Großschreibungsalias.
4. Direkte AMARIS-Primärquelle `https://my.idjstream.com:8686`.
5. Direkte AMARIS-Fallbackquelle `https://my.idjstream.com:8686/stream`.
6. Zusätzliche Emergency Chain über `/stream` und `/fallback-stream`.
7. GUI-Funktionen des internen Notfallplayers übernommen: Play, Pause, Stop, Reconnect, Mute, MAIN, BACK, History, Metadata, Listeners, Bitrate und DJ/Status.
8. Interner Notfallplayer `/internal` nicht ersetzt und nicht gekürzt.
9. Interne Worker-Blöcke `HTML`, `CSS`, `APP_JS` und `CONFIG_JS` maschinell bytegleich zum hochgeladenen aktuellen Repo bestätigt.
10. Release-Version auf v1.2.1 vereinheitlicht.
11. Unzuverlässige lokale Ordnernamen-Hardprüfung in `check-release.mjs` auf expliziten Opt-in umgestellt.
12. Safe-Root-Deploy-Vertrag im Release-Manifest korrigiert.
13. Worker-Route-Tabelle, Health-Ausgabe und Modulstatus um AMARIS ergänzt.
14. Tests für `/amaris` und die Erhaltung von `/internal` ergänzt.

## 4. Erhaltung des internen Notfallplayers

| Block | Unverändert | SHA256 |
|---|---:|---|
| HTML | TRUE | `63c4ef2ecc1c487497f9cdb3ed7b82785c91d3716ee3fd18d4fe10f322c29103` |
| CSS | TRUE | `1a122803961cac4e0447990d2713f4af94106eff414e74b07bac7f81651e356c` |
| APP_JS | TRUE | `6d5e291eb17f6a7bd87e6cf23a6dc314ba8b9caa20a8dccd5015d4a79dd05fe9` |
| CONFIG_JS | TRUE | `568b205bb2dd0ab9a4a5d2b51928fa95870ecead8987460ebd6794e68b86d2b5` |

Damit bleiben der bestehende interne Player, seine GUI, sein Boot-Verhalten und seine vorhandenen Worker-Fallbackrouten vollständig erhalten.

## 5. AMARIS-Fallbackreihenfolge

### MAIN

1. `https://my.idjstream.com:8686`
2. `https://my.idjstream.com:8686/stream`
3. `/stream`
4. `/fallback-stream`

### BACK

1. `https://my.idjstream.com:8686/stream`
2. `/fallback-stream`
3. `/stream`
4. `https://my.idjstream.com:8686`

Ein Fehler, ein Stream-Ende oder ein anhaltender Stall schaltet kontrolliert auf den nächsten Kandidaten. Es wurde kein neuer Watchdog in den Hauptplayer eingebaut.

## 6. Teststatus

- `npm run check`: PASS
- Node-Tests: 35/35 PASS
- JavaScript-/MJS-Syntax: 111 Dateien PASS
- Root/Public-Spiegel: 55 Paare PASS
- Haupt-HTML doppelte IDs: 0
- AMARIS doppelte IDs: 0
- Haupt-HTML Inline-Syntaxfehler: 0
- AMARIS Inline-Syntaxfehler: 0
- AMARIS Desktop-Render: PASS
- AMARIS Mobile-Render: PASS
- Interner Notfallplayer-Erhaltung: PASS

## 7. Noch nicht live geprüft

- Cloudflare-Produktivdeploy
- tatsächliche Live-Erreichbarkeit der beiden direkten AMARIS-Streamadressen
- reales iPhone-/Android-Audioverhalten
- CDN-/Browsercache nach dem nächsten Upload

## 8. Deployment-Regel

Die hochgeladene Quell-ZIP besitzt einen Wrapper-Ordner. Für Scriptable/GitHub/Cloudflare darf ausschließlich die neu erzeugte Safe-Root-Deploy-ZIP verwendet werden. Das Full-Backup ist getrennt und darf nicht als Repo-Root hochgeladen werden.
