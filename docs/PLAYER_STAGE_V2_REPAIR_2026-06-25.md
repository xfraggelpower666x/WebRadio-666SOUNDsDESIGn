# 666SOUNDsDESIGn WebRadio — Player Stage V2 Repair

Date: 2026-06-25
Target repository: `xfraggelpower666x/WebRadio-666SOUNDsDESIGn`
Target branch: `WebRadio-666SOUNDsDESIGn`

## Scope

- NOW PLAYING panel increased to roughly 2–2.5× the current height.
- Stream artwork increased substantially.
- Existing ticker lane restored and made visible.
- Player controls grouped in one stable control rack directly above the bottom meter.
- Existing real EQ panel moved into the control rack and enlarged.
- Main visualizer enlarged.
- Discord Shooter and Auto-DJ Skip exposed on the main player and mobile player.
- Discord Shooter first checks the existing Auth/PW gate, then opens the existing protected Discord message flow.
- Auto-DJ Skip uses the existing protected `/api/admin/gate-check` and `/api/admin/skip` routes.
- Outer side rails remain in place.
- Inner left/right modules are compacted symmetrically.
- New lower status panels use existing stream, metadata and MeterBus states.
- Existing `window.__MeterBus` is intercepted by a setter; no second analyser and no independent animation timer are created.
- Equalizer, bottom meter, side meters and side modules receive stronger attack/release-calibrated audio response.

## Protected systems not changed

- Worker routing
- Message backend
- HTTPS→HTTP stream fallback
- Emergency player
- Discord backend secrets
- Skip backend implementation
- Redirect-loop repair

## Deployment method

The Scriptable uploader creates one Git tree and one commit, then advances the target branch once. Root/public mirrors are written together.
