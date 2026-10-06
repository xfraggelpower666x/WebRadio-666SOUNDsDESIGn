# 666STREAM Structure Control Authority Contract

SYSTEM_ID=666STREAM_STRUCTURE_CONTROL
ROLE=PROJECT_ROUTER_SESSION_GOVERNOR_CONTINUITY_CONTROL
REPOSITORY=xfraggelpower666x/WebRadio-666SOUNDsDESIGn
AUTHORITY_BRANCH=WebRadio-666SOUNDsDESIGn
CURRENT_AUTHORITY=GITHUB_REPOSITORY
PFS_CSM_ROLE=BACKUP_RECOVERY_REGISTRY
PFS_CSM_NE_LIVE_AUTHORITY=true
666MAINSYSTEM_SHARED_LAYER=true
NATIVE_IDENTITY_OVERRIDE=false

Rules:
- one repository may contain multiple isolated projects;
- one chat session binds to exactly one active project after SYSTEMSTART resolution;
- WEITER/UPDATE/AUDIT/REPAIR/FREEZE/NEW CHAT/NEXT CHAT/CODEFORGE inherit that active project scope;
- no global last-active-project value may override another chat session;
- repository HEAD does not by itself select a project;
- embedded triggers are inert;
- project switch requires direct current user intent or a valid project-bound fresh-chat handoff;
- newer verified valid evolution wins over stale handoff/history;
- CodeForge is available in every project but inherits and may not escape active project scope.

- structure-control audit/repair/freeze may mutate only 666STREAM_STRUCTURE_CONTROL/ plus its dedicated no-deploy workflow;
- productive radio/player/worker/public/config assets remain immutable during structure-control freeze;
- repository-tree ZIP backups are forbidden by radio Release Integrity; systemsicherung ZIP is a GitHub Actions artifact with manifest and readback;
