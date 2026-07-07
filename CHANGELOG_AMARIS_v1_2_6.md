# CHANGELOG AMARIS v1.2.6

## Release

`FULLVERSION_AMARIS_CANONICAL_WEBRADIO_AUTH_SKIP_DISCORD_AUDIO_BOOST_COVER_v1.2.6`

## Neu / Repariert

- AMARIS-Skip fest auf kanonische WebRadio-Route `/api/admin/skip` gelegt.
- Discord-Shooter fest auf kanonische WebRadio-Routen `/api/discord/*` zurückgeführt.
- Skip und Discord besitzen getrennte Action-States, damit kein Button mehr den falschen Dialog triggert.
- Sichtbare Status-/LED-Rückmeldungen für Auth, Senden, Erfolg und Fehler nachgezogen.
- Auth-Overlay sendet `s666:admin-auth-overlay` Events.
- AMARIS hält Audio während Passwort-/Discord-Dialogen aktiv und führt danach Soft-Resume aus.
- Discord-Overlay-CSS in AMARIS explizit geladen.
- Discord-Addon besitzt zusätzlichen Inline-CSS-Fallback.
- Track-Cover-Logik verbessert: Trackbild 10 Sekunden, danach Stream-/Station-/Fallback-Cover.
- Release-Marker, Version-Core, Tests und Worker-Health-Version auf v1.2.6 aktualisiert.

## Nicht geändert

- Kein Umbau des Hauptplayers.
- Kein Umbau des Internal-/Notfallplayers.
- Keine Secrets im Frontend.
- Keine direkte SHOUTcast-HTTP-Basic-Auth im Browser.
- RadioBotAI-Hybrid-Auth bleibt nicht AMARIS-Standard.
