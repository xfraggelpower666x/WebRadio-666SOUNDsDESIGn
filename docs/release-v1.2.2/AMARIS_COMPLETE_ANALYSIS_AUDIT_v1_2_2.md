# 666SOUNDsDESIGn WebRadio — AMARIS Complete Analysis & Audit

**Release:** `FULLVERSION_AMARIS_ROUTE_IOS_LYVRA_DJ_REPAIR_v1.2.2`  
**Baseline:** `FULLVERSION_AMARIS_MINIMAL_PLAYER_REPAIR_v1.2.1`  
**Datum:** 2026-07-02  
**Modus:** vollständige lokale Quell-, Routing-, UI-, Audio-Start-, Fallback-, Metadaten- und Spiegelprüfung  
**Live-Deployment:** nicht durchgeführt

## 1. Zielvertrag

1. Alle bestehenden Player bleiben erhalten.
2. Nur der AMARIS-Endpunkt öffnet den eigenständigen AMARIS-LYVRA-Miniplayer.
3. `/` darf niemals durch AMARIS ersetzt werden.
4. `/internal` bleibt ein eigener Notfallplayer.
5. Der AMARIS-Player besitzt dieselben Kernfelder wie der Notfallplayer: Meta, Audio, Source, Now Playing, History, Listeners, Bitrate, DJ/Status, Play, Pause, Stop, Reconnect, Mute, MAIN und BACK.
6. AMARIS verwendet zuerst die Worker-Konfiguration und deren Switch-/Failover-Logik.
7. Auf iPhone/iPad darf der Startdialog nicht verschwinden, bevor Audio tatsächlich läuft.
8. Auto-DJ wird überall als `LYVRA DJ` angezeigt; ein echter Live-DJ überschreibt diesen Namen dynamisch.

## 2. Quellklassifikation

| Status | Quelle | Klasse | Audit-Bedeutung |
|---|---|---:|---|
| 🟩 | `worker.js` + Legacy-Worker-Spiegel | A | kanonisches Routing, Streamproxy, Runtime-Konfiguration, Metadatenproxy |
| 🟩 | `AMARIS/index.html` + Public-Spiegel | A | eigenständiger Miniplayer |
| 🟩 | `config/radio-runtime.json` | A | maßgebliche Stream-, Backup-, Emergency- und Metadatenquellen |
| 🟩 | eingebetteter `/internal`-Player | A | bestehender Notfallplayer und UI-Referenz |
| 🟩 | Root-`index.html` | A | bestehender Hauptplayer, Audio/EQ/Boost geschützt |
| 🟨 | v1.2.1-Tests | B | Strukturtest vorhanden, echter iPhone-Startpfad und statischer Routing-Fallback fehlten |
| 🟧 | Live-Domain-Verhalten | C | nur nach Deployment physisch prüfbar |

## 3. Bestätigte Fehlerursachen

### 🟥 F1 — Das iPhone zeigte nicht den AMARIS-Player

Der AMARIS-Player v1.2.1 verwendete den Startknopf `START AUDIO`. Der beobachtete Knopf `OK` existierte ausschließlich im eingebetteten `/internal`-Notfallplayer. Damit ist belegt, dass der iPhone-Aufruf nicht `AMARIS/index.html`, sondern den alten internen Fallbackpfad erhielt.

### 🟥 F2 — Kleingeschriebener physischer `/amaris`-Pfad fehlte

Im Paket existierte nur `AMARIS/index.html`. Der Worker übersetzte `/amaris` zwar programmatisch, aber ein statischer Cloudflare-/Pages-/Branch-Build ohne aktiven Workerpfad konnte den kleingeschriebenen Ordner nicht finden. Je nach Host-Fallback wurde dadurch der Root-Hauptplayer ausgeliefert. Das passt exakt zum PC-Befund: normaler Hauptplayer statt AMARIS-Miniplayer.

### 🟥 F3 — AMARIS umging zuerst die Worker-Konfiguration

Die v1.2.1-Kette startete mit hart codierten Direktquellen:

- `https://my.idjstream.com:8686`
- `https://my.idjstream.com:8686/stream`

Erst danach wurden `/stream` und `/fallback-stream` versucht. Die erste Direktadresse war zusätzlich nicht identisch mit dem kanonischen Primary-Stream aus `config/radio-runtime.json` (`https://my.idjstream.com/666soundsdesign/stream`). Damit konnte AMARIS veraltete oder ungeeignete Quellen vor der eigentlichen Worker-Switch-Logik verwenden.

### 🟥 F4 — iOS konnte nach einem Fehlstart in einem toten Zustand landen

Der v1.2.1-Startdialog wurde direkt ausgeblendet und der Startknopf deaktiviert. Ein fehlgeschlagenes `audio.play()` öffnete den Dialog nicht wieder. Auf iOS konnten nachfolgende automatische Fallback-Versuche außerdem außerhalb der ursprünglichen Benutzeraktivierung stattfinden. Ergebnis: Tipp angenommen, aber kein geöffneter beziehungsweise spielender Player.

### 🟧 F5 — Auto-DJ-Namen waren fragmentiert

Je nach Player-/Dashboard-/Discord-Pfad wurden unterschiedliche Fallbacknamen verwendet:

- `666SOUNDsDESIGn DJ`
- `DJ 666`
- `666 DJ`
- `kein Live-DJ`

Dadurch gab es keine systemweit eindeutige Auto-DJ-Identität und keine zentrale Umschaltdefinition.

### 🟨 F6 — Die v1.2.1-Tests bewiesen den realen Fehlerpfad nicht

Der alte Test prüfte nur `/amaris`, einige HTML-Marker und das Vorhandensein der Streamstrings. Nicht geprüft wurden:

- `/AMARIS`, Slash- und `index.html`-Aliase,
- physischer kleingeschriebener `amaris/`-Ordner,
- Trennung von Hauptplayer, AMARIS und `/internal`,
- POST-/Methodenabweisung,
- iOS-relevante Retry-Logik,
- zentrale Auto-DJ-/Live-DJ-Umschaltung.

## 4. Umgesetzte Reparaturen

### 🟩 R1 — Harter AMARIS-Routenlock

Die AMARIS-Erkennung läuft jetzt unmittelbar nach dem Parsen der URL und vor optionalen Add-ons. Folgende Pfade liefern denselben eigenständigen Miniplayer:

- `/amaris`
- `/amaris/`
- `/AMARIS`
- `/AMARIS/`
- `/amaris/index.html`
- `/AMARIS/index.html`

Antwortmarker:

- `x-player-mode: amaris-lyvra-minimal`
- `x-amaris-route-lock: standalone-only`
- `cache-control: no-store, no-cache, must-revalidate, max-age=0`

Wenn das AMARIS-Asset fehlt, wird `503` geliefert. Es gibt keinen stillen Rückfall auf den Hauptplayer.

### 🟩 R2 — Physischer statischer Routing-Fallback

Zusätzlich zu `AMARIS/index.html` wurden byte-identische kleingeschriebene Spiegel angelegt:

- `amaris/index.html`
- `public/amaris/index.html`

Damit funktioniert `/amaris` auch dann als eigener statischer Ordnerpfad, wenn eine Hosting-Schicht den Worker nicht ausführt.

### 🟩 R3 — Worker-first Audio- und Switch-Kette

Neue MAIN-Kette:

1. `/stream` — Worker MAIN Switch mit internem Primary/Backup/Emergency-Failover
2. `/fallback-stream` — Worker BACK Switch
3. Runtime-Primary als direkte Reserve
4. Runtime-Backup als direkte Reserve

Neue BACK-Kette:

1. `/fallback-stream`
2. `/stream`
3. Runtime-Backup als direkte Reserve
4. Runtime-Primary als direkte Reserve

Die direkten Reserven werden aus `/api/runtime-config/status` geladen und nicht mehr als alleinige Wahrheit behandelt.

### 🟩 R4 — iPhone-/iPad-Start repariert

- `audio.play()` wird innerhalb des direkten Tipp-Pfads ausgelöst.
- Der Startdialog schließt erst nach erfolgreicher Wiedergabe beziehungsweise `playing`.
- Bei Fehlschlag bleibt der Dialog sichtbar.
- Der Knopf wird als `ERNEUT VERSUCHEN` wieder freigegeben.
- Der nächste Tipp verwendet die nächste Worker-/Fallback-Stufe und besitzt damit erneut eine gültige Benutzeraktivierung.
- `playsinline` und `webkit-playsinline` bleiben aktiv.

### 🟩 R5 — UI-Parität zum Notfallplayer

Der AMARIS-Player verwendet die Notfallplayer-DNA für Panel, Lampen, Statuspills, Metadatenfenster, Statistikfelder und Bedienfelder. Die AMARIS-Überschrift bleibt eigenständig:

`A M A R I S - L Y V R A`  
`MINIMAL WEBRADIO`

### 🟩 R6 — Zentrale LYVRA-DJ-Umschaltung

Der Worker normalisiert Metadaten jetzt zentral:

- leer, `No DJ`, `AutoDJ`, `Auto-DJ`, `unknown`, alte Fallbacknamen → `LYVRA DJ`
- echter Name, zum Beispiel `FragglePower666` → unverändert

Zusätzliche Metadatenfelder:

- `dj`
- `dj_display`
- `dj_mode: autodj | live`

Aktualisierte Ausgabesysteme:

- Hauptplayer
- AMARIS-Miniplayer
- interner Notfallplayer
- externer Player
- Dashboard
- UI-Konfiguration
- Discord-Player-Addon
- Discord-Notify-Addon

## 5. Erhaltungsprüfung

| Bereich | Ergebnis |
|---|---|
| Root-Hauptplayer `/` | 🟩 erhalten |
| Interner Notfallplayer `/internal` | 🟩 als eigener Player erhalten |
| AMARIS `/amaris` | 🟩 getrennt und hart geroutet |
| Hauptplayer-Audioarchitektur | 🟩 nicht verändert |
| Equalizer | 🟩 nicht verändert |
| Booster | 🟩 nicht verändert |
| Meter-/Recovery-Hardlock | 🟩 nicht verändert |
| Admin-/Auth-Hardlock | 🟩 nicht verändert |
| Stream-Runtime-Konfiguration | 🟩 weiterhin kanonisch |
| Root/Public-Spiegel | 🟩 synchron |
| Root/Legacy-Worker-Spiegel | 🟩 synchron |

Hinweis: Im eingebetteten `/internal`-Player wurden ausschließlich die sichtbare Stationsüberschrift und die DJ-Metadaten-Normalisierung angepasst. Seine Stream-, Boot-, Transport- und Audioarchitektur blieb erhalten.

## 6. Automatisierte Verifikation

- Release-/Strukturcheck: **PASS**
- Node-Tests: **37 / 37 PASS**
- JavaScript-/MJS-Syntax: **111 / 111 PASS**
- AMARIS-Inline-JavaScript: **PASS**
- Public-Spiegelpaare: **56 PASS**
- AMARIS-Aliase: **6 / 6 PASS**
- AMARIS-Methodengate: **POST → 405 PASS**
- AutoDJ → `LYVRA DJ`: **PASS**
- Live-DJ → echter Name: **PASS**
- Hauptplayer-/AMARIS-/Internal-Trennung: **PASS**
- Verschachtelte ZIPs: **0**
- Python-Bytecode: **0**

## 7. Nicht als Live-PASS behauptet

Folgende Punkte benötigen nach dem Upload eine echte Geräte-/Domainprüfung:

1. Cloudflare nutzt tatsächlich den Produktivbranch `WebRadio-666SOUNDsDESIGn` und den richtigen Build-Root.
2. Der aktuelle Worker ist an der öffentlichen Domain aktiv.
3. iPhone Safari gibt den Stream unter realem Mobil-/WLAN-Netz wieder.
4. Upstream-Zertifikat, Codec und Shoutcast-Antwort funktionieren live.
5. Ein echter Live-DJ-Wechsel wird vom Upstream-Metadatenfeld korrekt geliefert.

## 8. Live-Abnahme nach Deployment

```text
/                         -> normaler Hauptplayer
/amaris                   -> AMARIS-LYVRA-Miniplayer
/AMARIS                   -> AMARIS-LYVRA-Miniplayer
/amaris/index.html        -> AMARIS-LYVRA-Miniplayer
/AMARIS/index.html        -> AMARIS-LYVRA-Miniplayer
/internal                 -> interner Notfallplayer
/api/runtime-config/status -> aktive Worker-Streamkonfiguration
/api/nowplaying           -> dj = LYVRA DJ oder echter Live-DJ
```

Erwartete AMARIS-Header:

```text
x-player-mode: amaris-lyvra-minimal
x-amaris-route-lock: standalone-only
cache-control: no-store, no-cache, must-revalidate, max-age=0
```

## 9. Gesamturteil

**🟩 LOCAL REPAIR PASS**

Die im Paket nachweisbaren Ursachen für Hauptplayer statt AMARIS, internen `OK`-Player statt AMARIS, iPhone-Dead-End nach dem Tipp, Worker-Bypass und uneinheitliche Auto-DJ-Namen wurden gezielt repariert. Alle bestehenden Player bleiben getrennt erhalten. Ein endgültiges Geräte-PASS ist erst nach dem realen Cloudflare-Deployment zulässig.

## Nächste sinnvolle Recherchepunkte

1. Produktive Cloudflare-Branch-/Build-Root-/Worker-Routenprüfung mit Headervergleich.
2. Echter iPhone-Safari-Test über WLAN und Mobilfunk einschließlich Sperrbildschirm/Background-Audio.
3. Live-DJ-Metadatenfeld während eines realen Broadcaster-Logins protokollieren.
4. Stream-Codec-/MIME-/Redirect-Audit für Safari und Chromium.
5. Optionaler automatischer Deployment-Smoke-Test für alle sechs AMARIS-Aliase.
