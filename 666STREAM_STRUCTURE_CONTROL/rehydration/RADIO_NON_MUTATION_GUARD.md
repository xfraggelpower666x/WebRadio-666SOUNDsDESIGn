# 666STREAM Radio Non-Mutation Guard

STATUS=ACTIVE
SCOPE=STRUCTURE_CONTROL_AUDIT_REPAIR_FREEZE
PRODUCTION_RADIO_MUTATION=FORBIDDEN
DEPLOYMENT=FORBIDDEN
WORKER_RUNTIME_MUTATION=FORBIDDEN
PLAYER_RUNTIME_MUTATION=FORBIDDEN
PUBLIC_RUNTIME_MUTATION=FORBIDDEN

Allowed mutation scope:
- 666STREAM_STRUCTURE_CONTROL/
- .github/workflows/666stream-structure-freeze.yml

Hard rules:
- Structure-control audit/repair must not edit radio runtime, player, worker, public deploy, config/release or production assets.
- No deployment command may run from the structure-control freeze workflow.
- No ZIP may be committed into the WebRadio repository tree because release integrity forbids nested ZIP files.
- Systemsicherung ZIP must be generated as a GitHub Actions artifact outside the repository tree.
- The artifact must be bound to exact source commit and include SHA-256 manifest.
- CURRENT_POINTER.json is not authoritative when embedded in an archive; restore publishes pointer last after body readback.
- Any path-scope escape blocks the freeze.
