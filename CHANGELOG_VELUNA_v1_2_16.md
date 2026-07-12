# VELUNA v1.2.16 — Direct Layer Cleanup

- Added direct design switches: `VELUNA PLAYER` on `/`, `666 PLAYER` on `/veluna`.
- Repaired ownership in the existing layers instead of adding another patch layer.
- `js/player-core.js` remains sole owner of 666 Player transport and source buttons.
- Phase10 stability code no longer captures transport/source clicks or document-wide first-touch audio.
- Removed AMARIS player directories, manifest, route, redirect, and debug references.
- Central VELUNA asset configuration remains the single branding source.
- VELUNA, 666 Player, and internal emergency player remain separate UIs.
