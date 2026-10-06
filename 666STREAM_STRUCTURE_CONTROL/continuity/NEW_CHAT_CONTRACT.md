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
