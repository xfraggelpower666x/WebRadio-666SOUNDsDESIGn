# AMARIS COMPLETE ANALYSIS AUDIT v1.2.5

## Anlass

Live-Rückmeldung nach v1.2.4:

- Auto-DJ Skip löst im Live-Test nicht nachvollziehbar aus und zeigt zu wenig Rückmeldung.
- Discord Shooter öffnet zwar, aber die Passwort-Autofill-Oberfläche wie im Hauptplayer fehlt.
- Beim Öffnen des Discord-/Auth-Dialogs kann der Player den Play-Zustand verlieren.
- Booster ist sichtbar, aber im Live-Test nicht hörbar.
- Das große Now-Playing-Feld soll sinnvoll als Cover-/Streambildfläche genutzt werden.

## Befund Hauptplayer / Discord

Der Hauptplayer besitzt bereits eine echte DOM-Gate-Oberfläche mit `input type="password" autocomplete="current-password"`. Genau deshalb kann iOS dort gespeicherte Passwörter anbieten. AMARIS v1.2.4 nutzte dagegen über den Shared-Auth-Client noch `window.prompt()`. Dieses Prompt ist nicht zuverlässig passwortmanagerfreundlich.

Der Discord Shooter ist im aktuellen Worker-Stand backendangebunden (`/api/discord/manual`, `/api/discord/message`, `/api/discord/nowplaying`). Ältere UI-Teile wirken lokal, senden aber letztlich über diese Worker-Routen. Zusätzlich wurde `/api/discord/test` als Kompatibilitätsroute ergänzt, weil Admin-Diagnostik diesen Pfad bereits referenziert.

## Reparaturen v1.2.5

- Shared Admin Auth bekommt eine echte Passwort-Modalbox mit `autocomplete="current-password"`.
- AMARIS verwendet keine `window.prompt()`-Auth mehr.
- Auth-/Discord-/Skip-Dialoge versuchen den laufenden Audiozustand zu erhalten und nach Dialogschluss soft zu resumieren.
- AMARIS Discord Button nutzt bevorzugt den bestehenden Discord-Shooter `messagePost()` statt direkt stumm `/api/discord/manual` zu feuern.
- Auto-DJ Skip zeigt jetzt sichtbare Status-LED und Text: Auth, sendet, gesendet, Fehler inklusive Backend-Fehlercode.
- Discord Shooter zeigt sichtbare Status-LED und Text: geöffnet, sendet, gesendet, Fehler.
- Booster-Status meldet nun Gain und WebAudio-Chain-Status.
- Mobile Boost-Gain-Stufen wurden deutlicher gesetzt.
- Now-Playing-Mittelfeld enthält jetzt ein Cover-/Streambild.
- Track-Cover aus Metadaten wird erkannt und 10 Sekunden eingeblendet, danach Rückfall auf Stream-/Fallback-Cover.
- Ticker läuft über dem Cover mit schwarzem Schatten/Glow für bessere Lesbarkeit.

## Geschützte Bereiche

Nicht verändert:

- Hauptplayer-Grundlayout
- `/internal` Notfallplayer
- Stream-Proxy-/Fallback-Architektur
- Auth-/Passwort-Worker-Vertrag
- Secrets/Tokens

## Live-Test erforderlich

Echter PASS für Skip, Discord und hörbaren Booster ist erst nach Cloudflare-Deploy mit produktiven Worker-Secrets möglich.
