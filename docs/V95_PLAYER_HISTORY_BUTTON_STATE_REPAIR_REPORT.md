# V95 — Player History Overlay + Button State Repair

Datum: 2026-05-08
Projekt: 666SOUNDsDESIGn WebRadio
Typ: Full Repo Build / isolierter Player-Frontend-Reparaturblock

## Reparaturblock

### Aufgabe 1 — History Overlay
- PC-History wird als Dialog/Overlay abgesichert.
- Close-Button wird per JS ergänzt, falls er im HTML fehlt.
- Backdrop/ESC/Outside-Click bleiben aktiv.
- iPhone-History bleibt innerhalb des Mobile-Players als Overlay erhalten.
- History-Texte wurden auf Englisch angepasst.

### Aufgabe 2 — Aktive Button-States
- PC Play/Pause/Stop bekommen persistente aktive Zustände.
- Aktiver Button wird pink/neon gefüllt dargestellt.
- iPhone Transport-State wurde repariert: Stop/Pause bleiben aktiv sichtbar statt nur kurz zu blinken.
- Play bleibt als spätere Audio-Reactive-Erweiterung vorbereitet.

## Nicht angefasst
- Kein Worker-Routing geändert.
- Keine Stream-Endpunkte geändert.
- Keine Discord-Worker-Routen geändert.
- Keine Boost-/Audio-Gain-Logik verändert.
- Keine Font-/Collider-/Holo-Cover-Module eingebaut.

## Prüfung
- `node --check js/player-core.js`: bestanden.
- `node --check js/addons/discord-player-addon-v3.js`: bestanden.
- Root bleibt sauber: `README.md` im Root, Reports in `/docs`.

## Nächster möglicher Block
- Levelmeter/EQ-Instandsetzung oder Holo-Cover/Branding, aber erst nach Stabilitätsmeldung zu v95.
