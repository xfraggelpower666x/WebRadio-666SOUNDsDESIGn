# 666SOUNDsDESIGn — V10 CLEAN ARCHITEKTUR (FINAL STABIL)

## Build direction
This package restores the project on top of the Recovery/Stabilized base and applies the current hard rules:

- Single Page Hero System
- Sticky Player only
- Hero = central UI
- Side level meters fixed
- No KV binding
- No R2 binding
- Intro served from GitHub/static asset
- Add-only direction
- Current live worker field model: `song`, `listeners`, `bitrate`, `dj`, `djstatus`, `art`, `active_source`

## Important files
- `index.html` → new GitHub-ready single-page HUD build
- `css/v10-hud.css` → complete HUD styling for the new build
- `js/v10-config.js` → current real worker/source config
- `js/v10-db.js` → browser IndexedDB source database
- `js/v10-app.js` → sticky player, source overlay, worker polling, admin tools
- `worker/radio-worker-github-intro.js` → radio worker without KV/R2 binding
- `worker/system-pw-worker.js` → central password worker pattern
- `database/stream_sources.sql` → optional SQL schema
- `assets/audio/WebRadio_666SOUNDsDESIGn_Intro.mp3` → intro file served from GitHub/static
- `assets/hero/hero-primary.jpeg` → uploaded hero reference
- `assets/reference/hud-layout-reference.jpeg` → uploaded HUD reference
- `assets/logo/logo-primary.jpg` → uploaded logo / icon reference

## Deployment
### GitHub Pages
Use branch:
`WebRadio-666SOUNDsDESIGn`

Do **not** use `main`.
Do **not** use `master`.

Upload the package contents to the repository and serve it from GitHub Pages on the `WebRadio-666SOUNDsDESIGn` branch.

### Cloudflare Workers
Deploy:
- `worker/radio-worker-github-intro.js`
- `worker/system-pw-worker.js`

### Mastering
The frontend songlab panel sends files to:
`https://666soundsdesign-mp3-mastering.fraggelpower666.workers.dev`

Expected worker endpoints:
- `/master`
- `/transcribe`
- `/situate`

The backend screenshot you provided indicates Render is used behind that worker. This package keeps the frontend pointed at the Cloudflare worker, not directly at the Render origin.

## Sticky player behavior
Native transport control is available for:
- radio streams
- GitHub intro MP3
- any direct audio/MP3 source you add in the source DB

Third-party platforms such as SoundCloud, Mixcloud and YouTube can be launched from the same sticky-player source workflow, but exact transport control remains limited by the host platform/browser sandbox.

## Source database
Directly usable persistence in the frontend is done with IndexedDB, because GitHub Pages is static.
For optional server-side persistence, `database/stream_sources.sql` is included.

## Worker changed / Cloudflare update needed
- Worker changed: **YES**
- Cloudflare update needed: **YES**, if the currently deployed radio/system workers do not yet match this package.
