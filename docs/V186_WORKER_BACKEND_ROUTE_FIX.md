# V186 Worker Backend Route Fix

Purpose: connect Player Alert Worker to deployed Render Alert Backend.

Changed:
- `wrangler.jsonc` now contains public `vars.PLAYER_ALERT_BACKEND_URL`.
- `worker.js` has the same Render URL as safe default if env vars are missing.
- KV remains fallback only.
- Cache remains last emergency fallback.

Backend URL:
`https://auto-setup-render-for-backend-mp3-ess8.onrender.com`

Expected worker flow:
1. `POST /api/player-alert/send`
2. Worker forwards to Render: `/api/player-alert/send`
3. Player reads `GET /api/player-alert/current`
4. Worker forwards to Render: `/api/player-alert/current`
5. KV only used if Render is unreachable.

Not touched:
- iPhone UI
- PC UI
- SEND frontend handler
- Ticker
- Meter
- Boost
- Discord addon
