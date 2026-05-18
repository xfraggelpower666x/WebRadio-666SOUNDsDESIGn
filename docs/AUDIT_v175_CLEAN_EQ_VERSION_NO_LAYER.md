# AUDIT v175 — CLEAN EQ + VERSION NO-LAYER

Created: 2026-05-18
Modified: 2026-05-18
Purpose: Clean the uploaded working repository ZIP without visual redesign.

## Basis
- Input ZIP: WebRadio-666SOUNDsDESIGn-WebRadio-666SOUNDsDESIGn (1).zip
- Scope: index.html only

## Changes
1. Removed obsolete PC mirror EQ layer code physically from index.html:
   - smfpPcDualEqBottomLayoutV157Final
   - smfpPcDualEqMirrorV157Final
   - smfpPcDualEqTrueMirrorCleanV157
   - smfpPcTickerEqWidthInnerDotV159
2. Verified `pcRealEqPanelMirror` references in index.html: 0.
3. Preserved the real manual EQ: `pcRealEqPanel` remains.
4. Preserved the graphic/main EQ/visualizer. No graphic EQ purge was performed.
5. Unified visible/runtime player version to `v175`:
   - meta smfp-version
   - pcVersionBadge
   - mobile version badge
   - CSS pseudo version content
   - runtime VERSION variables
   - html data-smfp-version
6. Removed remaining visible `BROADCAST READY` reference from index.html.

## Explicit non-changes
- No new visual layer added.
- No PC layout rebuild.
- No iPhone layout rebuild.
- No worker route changes in this package.
- No Discord secret values written into the repo.

## Verification
- `pcRealEqPanelMirror` in index.html: 0
- visible versions in index.html: v175 only
- CSS pseudo version values in index.html: v175 only
- runtime VERSION variables in index.html: v175 only
