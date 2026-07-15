# LYVRA v1.27.0 — SUPERSESSION GUARD

Status: SUPERSEDED DEVELOPMENT SOURCE
Do not promote.
Do not treat as latest active development state.

Reason:
A newer verified Drive active head exists: LYVRA v1.28.0 ACTIVE HEAD FREEZE, with separate CANONICAL and PC RECOVERY targets. The v1.27.0 package chain was created from an older assumed base and is retained only as a source package for controlled forward-porting.

Required continuation:
- Create v1.29.0 development integration branch from the current repository head.
- Treat v1.28.0 as the active system predecessor.
- Port the v1.27.0 package contents additively in ordered parts.
- Re-audit all cross-version contracts.
- Never overwrite or relabel v1.28.0.

Fail-closed:
Any loader encountering this file must block activation of v1.27.0 and continue with the last verified active state until v1.29.0 passes its full promotion gate.