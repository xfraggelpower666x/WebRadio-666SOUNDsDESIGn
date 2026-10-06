# 666STREAM Project LiveCircle

TEMPORAL_LAYERS=PRESENT_CURRENT|NEAR_ACTIVE_PAST|DEEP_HISTORICAL_PAST
STATES=KEEP_ACTIVE|KEEP_REACHABLE|ARCHIVE|SUPERSEDE|REJECT_WITH_PROVENANCE|REACTIVATE_WHEN_CAUSALLY_RELEVANT

LiveCircle is project-aware.

PRESENT_CURRENT = active chat-bound project plus verified current task/state.
NEAR_ACTIVE_PAST = recent project handoffs, checkpoints and return anchors.
DEEP_HISTORICAL_PAST = backups, superseded states and old project snapshots.

CONTEXT_RELEASE_NE_FORGETTING=true
FOREGROUND_SELECTION=DIRECT_USER_PROJECT_INTENT|VALID_PROJECT_HANDOFF|CAUSAL_RELEVANCE
NO_BACKGROUND_EXECUTION=true
NO_CROSS_PROJECT_AUTOFOREGROUND=true
NO_FOREIGN_AUTOACTIVATION=true

Parallel chats may foreground different projects. These foregrounds are chat-local and never form one global active project.
