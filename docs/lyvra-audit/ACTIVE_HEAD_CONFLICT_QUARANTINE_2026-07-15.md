# LYVRA ACTIVE HEAD CONFLICT QUARANTINE

Date: 2026-07-15
Status: CONFLICT QUARANTINE / FAIL CLOSED

## Verified authority chain
- Permanent Start Procedure requires: Discovery Anchor -> Live Register -> Active Head -> authority documents -> Canonical/PC comparison.
- Discovery Anchor states that chat memory is never authority.

## Verified v1.27 candidate facts
- Canonical candidate and PC-Recovery candidate are byte-identical.
- Candidate ZIP SHA-256: 4b88b3bc5cb43021c89ea68eb16ed36178b045df3c53b83aac6299b6001d986f
- Candidate contains eight control, ledger, audit and manifest files only.
- Candidate declares itself NOT ACTIVE.
- Parent active head named inside candidate: v1.26.0 / CHAT_DEV_PATCH_024 / Revision 001.

## Verified v1.27 freeze facts
- Canonical and PC-Recovery audit-freeze ZIPs are byte-identical.
- Freeze ZIP SHA-256: 46238dce1eece85b063e18d89c0dfd83ed9c60df79fddf6a6acdfbc87acf2080
- Promotion receipt status: READY_BUT_NOT_ACTIVE.
- Explicit promotion is required.
- Promotion decision states that v1.27.0 is not yet the active head.

## Conflict
The Live Register later names v1.27.0 as ACTIVE HEAD and records promotion authority text, but the verified candidate and freeze artifacts remain NOT ACTIVE / READY_BUT_NOT_ACTIVE. No separate promotion artifact was located during the current audit.

## Safety decision
- Do not activate v1.27.0, v1.28.0 or v1.29.0 from repository assumptions.
- Do not generate tracks from incomplete or conflicting state.
- Preserve all Drive and repository artifacts unchanged.
- Resolve the explicit promotion artifact or repair the Live Register authority chain before any new promotion.
- Full Canonical mirror remains incomplete.
