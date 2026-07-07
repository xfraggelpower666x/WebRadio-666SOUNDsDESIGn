# MASTER AUDIT / REPAIR PLAN - 2026-06-16

## Scope

Basis:

- Handoff attachments copied to `docs/handoffs/2026-06-15-radiobotai/`
- ZIP extracted to `docs/handoffs/2026-06-15-radiobotai/zip-extracted/`
- PDF text extracted to `docs/handoffs/2026-06-15-radiobotai/3-666SOUNDsDESIGn-Detaillierte-Sy.extracted.txt`

Requested focus:

- Handoff files integrated into the project folder
- Function list audited against current code
- Levelmeter / audio reactivity / skip repair implemented from handoff rules

## Repair Update - 2026-06-19

Implemented locally:

- one canonical SOUND button on the left and one canonical MESSAGE button on the right
- removed duplicate SOUND/MESSAGE triggers, direct EQ panel, boost panel, and dynamic ADMIN duplicate
- restored deterministic player section order; the system strip now sits directly above NOW PLAYING
- side meters use the central `window.__MeterBus`; the second timer no longer writes transforms to them
- left/right side meters receive identical values and differ only by mirrored flex direction
- public vote-skip and legacy token skip are denied
- player and Media Session next-track call only `POST /api/admin/skip`
- admin skip requires same-origin, Auth Worker verification, PW Worker verification, and cooldown
- Shoutcast credentials remain Worker-only

Required deployment configuration:

- `ADMIN_AUTH_VERIFY_URL`
- `PW_VERIFY_URL` (verification endpoint, not the health endpoint)
- `SHOUTCAST_ADMIN_URL`
- `SHOUTCAST_ADMIN_USER`
- `SHOUTCAST_ADMIN_PASSWORD`
- `SHOUTCAST_SID`
- optional `ADMIN_SKIP_COOLDOWN_MS`

Fail-closed behavior:

- missing token, missing `PW_VERIFY_URL`, timeout, non-JSON response, `ok !== true`, foreign/missing Origin, or upstream failure rejects the skip
- the SKIP button remains hidden unless both verification workers report success

## Handoff Rules Applied

- Preserve existing structure.
- Do not add a new layer over a broken layer.
- Meter may measure and display.
- Meter must not call `play()`, `load()`, `src` reset, or recovery.
- Stream buffering LED/status is diagnostic only.
- Worker is the broker for protected remote actions.
- No real secrets in frontend files, docs, or repo examples.

## Function Audit Against Current Code

### Stream / URL Presets

Current code already has the handoff URLs:

- `worker.js`
  - primary upstream: `https://my.idjstream.com/666soundsdesign/stream`
  - fallback upstream: `https://my.idjstream.com:8686/stream`
  - fallback alt: `https://my.idjstream.com/8686/stream`
  - metadata: `https://my.idjstream.com/cp/get_info.php?p=8686`
- `config/stream.config.js`
  - `/stream`
  - `/fallback-stream`
  - `/api/nowplaying`

Gap:

- Stream preset registry is still hardcoded in several places.
- Full admin-editable stream registry is still a later task.

### Audio Authority / Recovery

Current code has multiple audio/recovery owners:

- `js/player-core.js`
- inline MFF engine in `index.html`
- `js/phase10-stability-iphone-panel-hud.js`
- `js/equalizer.js`

Existing protection found:

- MFF selfheal already checks `window.S666_AUDIO_HEALING_ORCHESTRA.active` and becomes sensor-only when the orchestra is active.

Remaining risk:

- `js/equalizer.js` and the MFF inline engine can both attempt `createMediaElementSource()` for an audio element. This must stay monitored because browsers allow only one `MediaElementSource` per audio element.

### Levelmeter / Visualizer

Current code has:

- side meters: `leftMeterA/B/C`, `rightMeterA/B/C`
- bottom meter segments: `[data-bottom-meter-seg]`
- central visualizer: `js/equalizer.js`
- addon reactivity: `index.html` reads `window.__MeterBus`

Repairs implemented:

- `v27StableMapping()` no longer recursively calls itself.
- `window.__MeterBus` now includes:
  - `source: "real" | "hybrid" | "synthetic"`
  - `synthetic`
  - `hybrid`
  - real/hybrid `eq` band vector
- fallback meter motion is explicitly marked as `synthetic`.
- PC addon status LED logic no longer treats synthetic meterbus as real live meter state.

### Skip / Next / Auto-DJ

Previous state:

- `js/skip-control.js` expected `window.S666_DJ_PANEL_API`.
- No code initialized `window.S666_DJ_PANEL_API`.
- `worker.js` had no `/api/skip` route.
- Browser prompt said admin password and posted it to the remote API.

Repairs implemented:

- `worker.js` now owns:
  - `GET /api/skip/status`
  - `GET /api/skip/votes`
  - `POST /api/skip/vote`
  - `POST /api/skip`
  - `OPTIONS /api/skip*`
- `js/skip-control.js` defaults to same-origin `/api`.
- `js/media-session-ios.js` defaults next-track vote to same-origin `/api`.
- Admin skip now sends a Worker admin token to the Worker, not a Shoutcast password to the frontend.
- Shoutcast/SonicPanel credentials are only read from Worker ENV.

Expected Worker ENV names:

- `SHOUTCAST_ADMIN_URL`
- `SHOUTCAST_ADMIN_USER`
- `SHOUTCAST_ADMIN_PASSWORD`
- `SHOUTCAST_SID`
- `SHOUTCAST_SKIP_MODE`
- `SONICPANEL_SKIP_URL`
- `SONICPANEL_SKIP_TOKEN`
- `SKIP_ADMIN_TOKEN`
- `SKIP_ADMIN_PASSWORD`
- `SKIP_VOTE_THRESHOLD`

Examples were added only as placeholders:

- `.dev.vars.example`
- `config/admin-runtime.env.example`

No real secrets were added.

## Files Changed

- `.dev.vars.example`
- `config/admin-runtime.env.example`
- `index.html`
- `js/equalizer.js`
- `js/media-session-ios.js`
- `js/skip-control.js`
- `worker.js`
- `docs/handoffs/2026-06-15-radiobotai/*`
- `docs/MASTER_AUDIT_REPAIR_PLAN_2026-06-16_RADIOBOTAI_HANDOFF.md`

Pre-existing local changes observed and preserved:

- `index.html` logo image change
- `dashboard/index.html` artwork fallback quoting fix
- `Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js` syntax repair from previous task

## Remaining Work

1. Configure Worker secrets in Cloudflare:
   - Shoutcast/SonicPanel skip URL and credentials
   - Worker skip admin token

2. Decide final upstream skip format:
   - Shoutcast `admin.cgi?mode=nextsong`
   - SonicPanel-specific skip endpoint if provider exposes one

3. Add a true central stream preset registry:
   - Worker ENV defaults
   - optional admin update path
   - dashboard readout

4. Reduce audio graph ownership risk:
   - one central helper for `createMediaElementSource`
   - all visual/meter modules consume the same graph or only consume `window.__MeterBus`

5. Browser QA after local/Worker deploy:
   - desktop play/pause/stop
   - iPhone play/pause/stop
   - levelmeter real/hybrid/synthetic state
   - `/api/skip/status`
   - vote skip threshold
   - admin skip with Worker admin token

## Verification Notes

Local syntax verification must pass before deploy. Cloudflare Wrangler dry-run/deploy was not run in this audit unless explicitly requested, because it can send bundle data to Cloudflare.
