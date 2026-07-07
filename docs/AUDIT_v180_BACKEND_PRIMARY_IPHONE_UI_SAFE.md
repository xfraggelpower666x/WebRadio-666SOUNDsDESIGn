# AUDIT v180 — Backend Primary + iPhone UI Safety

Basis: v178 Overlay-Core ZIP.

Geändert:
- Worker `/api/player-alert/*` auf Backend-primary umgestellt.
- Fallback-Reihenfolge: Renda/Render Backend -> `PLAYER_ALERT_KV` -> Cloudflare Cache.
- Player-SEND ist nicht Discord-primary.
- iPhone: History aus oberer Now-Playing-Zone in Funktionsleiste verschoben.
- iPhone: Version als kleiner Footer-Text unter dem unteren Meter vorbereitet.
- iPhone: Discord-Außenpanel optisch entkernt, nur LED/DC/MSG.
- iPhone: SEND-Status-LEDs für Request/Confirm/Fail.
- iPhone: Boost-LED 5 ergänzt.

Nicht geändert:
- PC-EQ nicht angefasst.
- PC-Layout nicht angefasst.
- Discord-Secrets nicht ins Repo geschrieben.

Cloudflare nötig:
- Optional: `PLAYER_ALERT_BACKEND_URL` als Variable setzen.
- `PLAYER_ALERT_KV` als Fallback-Binding bleibt sinnvoll.
