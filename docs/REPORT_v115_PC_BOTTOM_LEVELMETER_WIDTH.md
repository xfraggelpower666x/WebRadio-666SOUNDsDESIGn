# v115 — PC Bottom Levelmeter Width Fix

## Scope
- Basis: v114 INITIAL TICKER + DJ STATE.
- Changed only desktop bottom levelmeter sizing.
- The bottom levelmeter is constrained to the same width logic as the desktop player shell.

## Fixed
- `#pcBottomSyncMeter` no longer spans beyond the main player width.
- It no longer runs over/behind the left and right side meters.

## Not touched
- No iPhone layout changes.
- No ticker logic changes.
- No EQ/visualizer replacement.
- No Discord changes.
- No Worker/stream routing changes.
- No audio transport changes.

## Files intentionally changed
- `css/desktop.css`
- version/cache references in `index.html` and `js/player-core.js`
- this report in `/docs/`
