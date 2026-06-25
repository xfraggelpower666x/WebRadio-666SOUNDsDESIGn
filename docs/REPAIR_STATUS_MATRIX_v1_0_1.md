# Repair Status Matrix – v1.0.1

**Quelle:** WEBRADIO_666SOUNDSDESIGN_KOMPLETTAUDIT_2026-06-25  
**Datum:** 25. Juni 2026  
**Repo-/Scriptable-Upload:** READY  
**Live-Produktivzertifizierung:** noch nicht behauptet

## Statuszählung

- `CONFIGURATION_REQUIRED`: **1**
- `FIXED`: **32**
- `FIXED_CONFIGURATION_REQUIRED`: **1**
- `GOVERNED`: **1**
- `MITIGATED`: **6**
- `MITIGATED_CONFIGURATION_REQUIRED`: **1**
- `RESIDUAL_RISK`: **1**

## Einzelbefunde

| ID | Schwere | Reparaturstatus | Befund |
|---|---|---|---|
| C-01 | CRITICAL | `FIXED` | Haupt-Worker bricht wegen fehlendem handleSkipApi ab |
| C-02 | CRITICAL | `FIXED` | Öffentlicher Render-Schreibendpunkt umgeht Worker-Authentifizierung |
| C-03 | CRITICAL | `FIXED` | ASSETS-Binding fehlt, obwohl der Worker env.ASSETS zwingend erwartet |
| C-04 | CRITICAL | `FIXED` | Admin-Streamänderungen werden erfolgreich gemeldet, steuern den aktiven Worker aber nicht |
| H-01 | HIGH | `FIXED` | Chaos-API-Add-on ist importiert und dokumentiert, wird aber nie aufgerufen |
| H-02 | HIGH | `FIXED` | Unbekannte API- und Asset-Routen liefern 200-HTML statt 404/JSON |
| H-03 | HIGH | `FIXED` | Archiv ist kein deployfähiger Safe Root |
| H-04 | HIGH | `MITIGATED_CONFIGURATION_REQUIRED` | Player-Alert-Zustand ist nur Prozessspeicher |
| H-05 | HIGH | `FIXED_CONFIGURATION_REQUIRED` | Suno-System ist kein funktionsfähiger Provider-Adapter |
| H-06 | HIGH | `FIXED` | Keine automatisierten Tests, kein CI und keine reproduzierbare Root-Builddefinition |
| H-07 | HIGH | `FIXED` | Produktionsnahe Debug-Endpunkte sind öffentlich |
| H-08 | HIGH | `FIXED` | Audio-Upload ohne Größenlimit und ffmpeg ohne Timeout |
| H-09 | HIGH | `FIXED` | Admin-Passwort/Token wird in Query-Parameter geschrieben |
| H-10 | HIGH | `RESIDUAL_RISK` | Mehrere Transport-/Recovery-Schichten steuern dasselbe Audioelement |
| H-11 | HIGH | `FIXED` | README behauptet Recovery- und Mirror-Strukturen, die fehlen |
| M-01 | MEDIUM | `CONFIGURATION_REQUIRED` | KV-Fallback ist im Code, aber nicht in Wrangler gebunden |
| M-02 | MEDIUM | `MITIGATED` | Cache-API wird als globale Sperre verwendet |
| M-03 | MEDIUM | `FIXED` | Ein einzelner globaler Rate-Key sperrt alle Sender drei Minuten |
| M-04 | MEDIUM | `FIXED` | GitHub-Aufrufe ohne Timeout und mit zu detaillierter Fehlerweitergabe |
| M-05 | MEDIUM | `FIXED` | Auth-Verifikation ohne Timeout; Auth-Details werden im 401 zurückgegeben |
| M-06 | MEDIUM | `FIXED` | Ungültiges JSON und Payloadgröße werden nicht sauber behandelt |
| M-07 | MEDIUM | `FIXED` | External Worker erlauben CORS für alle Origins |
| M-08 | MEDIUM | `FIXED` | Metadata-Fetch ohne eigenen Timeout; Upstream-URL wird als Header offengelegt |
| M-09 | MEDIUM | `MITIGATED` | Kein konsistentes CSP-/Clickjacking-/Nosniff-Headerkonzept |
| M-10 | MEDIUM | `FIXED` | Renderer liegt doppelt in zwei nahezu identischen Bäumen |
| M-11 | MEDIUM | `FIXED` | Als JSON deklarierte Auditdatei ist leer |
| M-12 | MEDIUM | `FIXED` | Suno-ENV-Name ist widersprüchlich |
| M-13 | MEDIUM | `MITIGATED` | Eingebetteter Alt-Player und aktueller index.html sind zwei getrennte Produktstände |
| M-14 | MEDIUM | `FIXED` | Worker sendet username, Render-Schema verwirft ihn |
| M-15 | MEDIUM | `FIXED` | Root-Compatibility-Date ist deutlich älter als Teilprojekte |
| M-16 | MEDIUM | `FIXED` | Generierte Python-Bytecode-Dateien sind eingecheckt |
| M-17 | MEDIUM | `MITIGATED` | Root-Abhängigkeiten und Security-Scanning sind nicht reproduzierbar |
| M-18 | MEDIUM | `FIXED` | Prompt-Limits werden blind abgeschnitten; Validator erzeugt mögliche False Positives |
| M-19 | MEDIUM | `FIXED` | Gerüst-Endpunkte spiegeln Payloads zurück; Story-Endpunkte sind öffentlich und leer |
| M-20 | MEDIUM | `MITIGATED` | Mehrere Generationen desselben SEND-/Modal-Codes bleiben gleichzeitig aktiv |
| L-01 | LOW | `FIXED` | Zweiter /health-Zweig ist unerreichbar |
| L-02 | LOW | `FIXED` | Modul-/Routen-Diagnose enthält falsche Statusangaben |
| L-03 | LOW | `FIXED` | Root-Alias /The-Dark-Dancer.html trifft Sonderroute nicht |
| L-04 | LOW | `FIXED` | Keine .gitignore vorhanden |
| L-05 | LOW | `FIXED` | Manifest deklariert quadratisches Icon als Wide-Screenshot; kein Service Worker vorhanden |
| L-06 | LOW | `MITIGATED` | Historische Auditdaten dominieren den Live-Baum |
| L-07 | LOW | `FIXED` | Keine Lizenzdatei gefunden |
| L-08 | LOW | `GOVERNED` | Weitere bytegleiche Core-/Asset-Dateien vorhanden |

## Verbleibende harte Grenzen

- Die historische Browser-Audio-Recovery-Schichtung wurde nicht blind entfernt; hierfür ist ein echter iPhone-/Browser-Paritätstest erforderlich.
- Cloudflare-KV-Namespace-IDs, Secrets und externe Providerdaten sind absichtlich nicht im Paket enthalten.
- Geteilte Render-Persistenz benötigt PostgreSQL über `DATABASE_URL`; SQLite ist nur lokale Dienstablage.
- Ein Suno-kompatibler Provider muss über das dokumentierte REST-Schema konfiguriert werden.
