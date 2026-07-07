# AMARIS · LYVRA Minimal WebRadio — Portable Handoff v1.2.1

## Endpoint

`/amaris`

Zusätzliche Aliase:

- `/amaris/`
- `/AMARIS`
- `/AMARIS/`
- `/AMARIS/index.html`

## Repo-Dateien

- `AMARIS/index.html`
- `public/AMARIS/index.html`

Beide Dateien müssen byte-identisch bleiben.

## Überschrift

`A M A R I S - L Y V R A   MINIMAL WEBRADIO`

Darstellung: Neon-Türkis mit leichtem Neon-Pink-Shine.

## Direkte Streamquellen

- Primär: `https://my.idjstream.com:8686`
- Fallback: `https://my.idjstream.com:8686/stream`

## Zusätzliche bestehende Notfalllogik

- `/stream`
- `/fallback-stream`
- Metadaten: `/api/nowplaying`

## GUI-Funktionen

- Start Audio / Boot-Initialisierung
- Play
- Pause
- Stop
- Reconnect
- Mute / Unmute
- MAIN
- BACK
- History
- Now Playing
- Metadata-Status
- Audio-Status
- Source-Status
- Listeners
- Bitrate
- DJ / Status

## Harte Erhaltungsregel

Der bestehende interne Worker-Notfallplayer bleibt unter `/internal` erhalten. Seine eingebetteten Blöcke `HTML`, `CSS`, `APP_JS` und `CONFIG_JS` dürfen durch AMARIS nicht ersetzt, verkürzt oder umgeleitet werden.

## Worker-Vertrag

`serveAmarisPlayer()` liefert ausschließlich `public/AMARIS/index.html` mit `cache-control: no-store` aus. Der Hauptplayer `/`, der interne Player `/internal`, `/stream`, `/fallback-stream` und `/api/nowplaying` bleiben getrennte bestehende Routen.
