# 666SOUNDsDESIGn Cybertechnic Radio Dashboard Addon v1.0.1

**Projekt:** WebRadio-666SOUNDsDESIGn  
**Dokumenttyp:** Dashboard-Addon-Handoff  
**Version:** v1.0.1  
**Owner:** xfraggelpower666x  
**Repo:** WebRadio-666SOUNDsDESIGn  
**Branch:** Codex  
**Zielpfad:** `/root/Discord-RadioBot/dashboard.html`  
**Status:** PASS  
**Secrets:** Keine Secrets/Tokens in diesem Addon.

## Ziel

Dieses Paket integriert ein eigenständiges Cybertechnic-Neon-Dashboard als Addon, ohne die produktive `index.html` des WebRadio-Players zu überschreiben.

## Dateien

```text
/root/Discord-RadioBot/dashboard.html
/root/Discord-RadioBot/css/radio-dashboard-addon.css
/root/Discord-RadioBot/js/radio-dashboard-addon.js
/root/Discord-RadioBot/assets/dashboard-ui/dashboard-background.png
/root/Discord-RadioBot/assets/dashboard-ui/dashboard-header.png
/root/Discord-RadioBot/assets/dashboard-ui/design-reference.png
/root/Discord-RadioBot/snippets/dashboard-link-snippet.html
/docs/DASHBOARD_ADDON_HANDOFF.md
/docs/DASHBOARD_ADDON_AUDIT.md
/docs/DASHBOARD_ENDPOINT_CONTRACT.md
```

## Design

- Cybertechnic Dashboard Layout
- Neon Lila / Neon Pink / Neon Türkis
- dunkler HUD-Look
- Karten, Status-Leds, Signalring, Bars, Metadata Curve
- Hintergrundbild = `dashboard-background.png`
- Headerbild = `dashboard-header.png`
- Referenzbild = `design-reference.png`

## Integration

1. Dateien in das Repo übernehmen.
2. `dashboard.html` neben der vorhandenen `index.html` deployen.
3. Optional den Link aus `snippets/dashboard-link-snippet.html` in die vorhandene `index.html` einfügen.
4. Keine bestehende Playerlogik ersetzen.

## API-Erwartung

Das Dashboard fragt folgende vorhandene oder noch zu ergänzende Endpunkte ab:

```text
GET  /api/nowplaying
GET  /api/discord/status
POST /api/discord/message
POST /api/discord/nowplaying
```

Wenn Endpunkte fehlen, zeigt das Dashboard sichere Fallback-/Debugmeldungen. Keine Tokens oder Webhook-URLs werden im Frontend gespeichert.

## Stream Presets

```text
https://my.idjstream.com/666soundsdesign/stream
https://my.idjstream.com:8686/stream
https://my.idjstream.com/8686/stream
```

## Player Links

```text
https://webradio.666soundsdesign-broadcaster.com/
https://idjstream.app/cp/widgets/player/?p=8686&type=sonic
https://webradio.666soundsdesign-broadcaster.com/stream
```

## Discord Shooter

Der Discord Shooter ist nur Frontend-UI. Er sendet an Backend-/Worker-Endpunkte. Secrets bleiben im Backend, nicht im Browser.

## Nicht betroffen

- bestehender Player
- bestehende `index.html`
- bestehende Worker-Routen, sofern vorhanden
- Stream-Playback
- Admin-Login
- Audio Engine

## Codex-Hinweis

Codex soll dieses Addon additiv integrieren. Nicht die bestehende `index.html` ersetzen, außer der Nutzer verlangt es ausdrücklich.
