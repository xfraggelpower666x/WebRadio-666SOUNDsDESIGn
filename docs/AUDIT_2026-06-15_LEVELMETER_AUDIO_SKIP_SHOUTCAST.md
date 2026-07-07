# AUDIT 2026-06-15 - Levelmeter, Audio-Reaktivitaet, Auto-DJ Skip

## Scope

Projektordner:

`F:\GitHub Clone Repos\666SOUNDsDESIGn - WebRadio _ Broadcaster\WebRadio-666SOUNDsDESIGn`

Geprueft wurden:

- Levelmeter / Side-Meter / Bottom-Meter
- Audio-Reaktivitaet und WebAudio-Graph
- Auto-DJ / Lied ueberspringen ueber Shoutcast-Admin-Zugang
- Frontend- und Worker-Verkabelung

## Ergebnis Kurzfassung

Der Player hat echte WebAudio-Reaktivitaet im Desktop-Hauptpfad, aber mehrere parallele Audio-/Meter-Systeme koennen sich gegenseitig blockieren. Der Skip-Button ist im Frontend sichtbar, aber nicht mit einem funktionierenden Same-Origin-Worker-Backend fuer Shoutcast-Admin-Skip verbunden.

## Kritische Befunde

### 1. Shoutcast Admin Skip ist nicht backendseitig verdrahtet

Dateien:

- `js/skip-control.js`
- `js/media-session-ios.js`
- `worker.js`

`js/skip-control.js` nutzt:

- `window.S666_DJ_PANEL_API`
- `POST /skip/vote`
- `GET /skip/votes`
- `POST /skip`

Im Projekt wird `window.S666_DJ_PANEL_API` aber nirgends initial gesetzt. Der Root-Worker hat keine `/skip`-, `/skip/vote`- oder `/api/skip`-Route. Damit kann der Button ohne externe Zusatz-API nicht funktionieren.

### 2. Admin-Passwort darf nicht aus dem Browser an Shoutcast gehen

`js/skip-control.js` fragt aktuell per `window.prompt()` ein Admin-Passwort ab und sendet es als `X-Admin-Password` an eine API.

Fuer echten Shoutcast-Skip muss das Passwort im Worker als Secret liegen, nicht im Browser:

- `SHOUTCAST_ADMIN_URL`
- `SHOUTCAST_ADMIN_USER`
- `SHOUTCAST_ADMIN_PASSWORD`
- optional `SHOUTCAST_SID`

Der Browser darf nur einen autorisierten Worker-Endpunkt aufrufen, z. B. `POST /api/skip`.

### 3. Zwei WebAudio-Graphen konkurrieren um dasselbe Audioelement

Dateien:

- `js/equalizer.js`
- `index.html`

`js/equalizer.js` erzeugt im Hauptpfad:

`ctx.createMediaElementSource(audio)`

Die mobile Inline-Engine in `index.html` erzeugt ebenfalls:

`ctx.createMediaElementSource(audio)`

Ein `HTMLAudioElement` darf im Browser nur einmal an einen `MediaElementSource` gebunden werden. Danach wirft der zweite Versuch einen Fehler. Das fuehrt dazu, dass eine Engine in Fallback/Volume-Modus kippt und echte Audio-Reaktivitaet unzuverlaessig wird.

### 4. Levelmeter kann echt aussehen, obwohl es synthetisch laeuft

`js/equalizer.js` nutzt echte Analyzer-Daten, schaltet aber bei schwachen Frames schnell auf Hybrid-Fallback. Trotzdem wird `window.__MeterBus` weiter mit frischem Timestamp geschrieben. Andere Module erkennen das dann als "live", obwohl die Bewegung teils synthetisch ist.

### 5. `window.__MeterBus.eq` liefert keine echten EQ-Bandwerte

Der Meterbus schreibt `level`, `peak`, `left`, `right`, aber `eq` bleibt leer. PC-Side-Addon-Module bauen ihre Bandbewegung dadurch ueber Fallback-Vektoren. Die Reaktivitaet ist also nicht voll frequenzbasiert.

### 6. Mobile `--audio-level` ist synthetisch

Die Fallback-Intervalle in `js/equalizer.js` schreiben `--audio-level` aus Play-State und Boost-Stage. Das ist fuer Sichtbarkeit okay, aber kein echter RMS-/Audiopegel.

### 7. Tote Rekursions-Landmine in `v27StableMapping`

`js/equalizer.js` enthaelt eine Funktion `v27StableMapping`, die sich innerhalb ihrer eigenen Schleife rekursiv aufruft. Sie scheint aktuell nicht aktiv genutzt zu werden, wuerde bei Aufruf aber in Stack Overflow laufen.

## Empfohlene Reparatur-Reihenfolge

1. Worker-Backend fuer Skip bauen:
   - `OPTIONS /api/skip`
   - `POST /api/skip`
   - optional `POST /api/skip/vote`
   - optional `GET /api/skip/votes`

2. Shoutcast-Skip nur im Worker ausfuehren:
   - Worker liest Secrets aus ENV
   - Worker ruft Shoutcast Admin-Endpoint auf
   - Browser sieht niemals Shoutcast-Passwort

3. `skip-control.js` auf Same-Origin `/api` umstellen:
   - Default: `API_BASE = window.S666_DJ_PANEL_API || "/api"`
   - Admin-Skip ruft `/api/skip` auf

4. Eine Audio-Authority festlegen:
   - Desktop: `player-core.js` + `equalizer.js`
   - Mobile: entweder dieselbe Audio-Quelle nutzen oder die Inline-MFF-Engine strikt getrennt halten
   - Kein zweites `createMediaElementSource` auf demselben Audioelement

5. Meterbus verbessern:
   - `window.__MeterBus.source = "real" | "hybrid" | "synthetic"`
   - echte `eq`-Bandwerte fuellen
   - Addon-Module nur bei `real/hybrid` als live markieren

6. Mobile Levelwriter trennen:
   - echter RMS-Wert, wenn Analyzer aktiv
   - sichtbarer Fallback nur mit klarer Kennzeichnung

7. `v27StableMapping` entfernen oder reparieren.

## Nicht ausgefuehrt

Kein Wrangler Deploy/Dry-Run. Das koennte Code oder Metadaten an Cloudflare senden und braucht explizite Freigabe.

## Lokaler Status

Bei diesem Audit wurde kein Commit erstellt und nichts gepusht.

