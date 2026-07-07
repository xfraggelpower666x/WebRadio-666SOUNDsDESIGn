# v145 — PC VU Matrix Root Reactivity Fix

Scope: only the existing right-top `VU MATRIX` module inside the PC side add-on tower.

Changes:
- Kept the existing VU Matrix DOM/module.
- Fixed the root layout problem that prevented the VU bars from visibly rising.
- Forced the existing VU channel slots to have real height.
- Kept the existing EQ/levelmeter-driven values and reused the existing side-addon update loop.
- Updated visible/cache version strings to v145.

Not changed:
- No new layer.
- No new audio loop / RAF loop / interval loop.
- No player-core changes.
- No ticker changes.
- No transport changes.
- No iPhone changes.
- No Discord/Worker/Stream changes.
