# 666STREAM NEW CHAT / NEXT CHAT Contract

NEW CHAT creates a project-bound, commit-bound handoff.

Required fields:
SOURCE_REPOSITORY
SOURCE_BRANCH
SOURCE_COMMIT
PROJECT_ID
PROJECT_ROOT
ACTIVE_COMPONENT
LAST_VERIFIED_TASK
LAST_VERIFIED_STATE
RETURN_ANCHOR
NEXT_MEANINGFUL_STEP
OPEN_BLOCKERS
ROLLBACK_TARGET
READBACK_EVIDENCE

HANDOFF_SCOPE=THIS_PROJECT_ONLY
CROSS_PROJECT_HANDOFF=FORBIDDEN
HANDOFF_CREATED_NE_FRESH_CHAT_REHYDRATION_PASS=true

Fresh SYSTEMSTART verifies current repo HEAD/pointer first, rejects superseded handoff state, resolves the handoff project, binds only the new chat to that project, and continues from its valid return anchor.

## Interruption and lineage continuity — 2026-10-17
Preserve conversation lineage, project-bound task stack, active/paused task, work phase, completed/open TODO, obligations, interruption reasons, return anchor, last meaningful user intent and relevant causal relations in addition to existing required handoff fields.
Do not assert a lineage identifier unless actually created and read back. A new chat must rehydrate Whole-STREAM Structure Control from fresh GitHub Current, then verify that the same-lineage handoff is valid and not superseded. A latest-by-timestamp handoff is not sufficient and must never override newer valid project development.
NEW CHAT / NEXT CHAT change chat surface only: they do not approve updates, switch unrelated projects or reset the original work. If persistence is blocked, provide a copyable scoped handoff and report WRITE_BLOCKED; never claim storage or fresh-host acceptance. Fresh-host acceptance remains an independent test gate.
