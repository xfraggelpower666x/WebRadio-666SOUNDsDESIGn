# 666STREAM → PFS/CSM Backup Relation Contract

This carrier defines desired backup relationships only. It does not mutate PFS/CSM and is not PFS authority.

PFS_CSM_ROLE=BACKUP_RECOVERY_REGISTRY
PFS_CSM_NE_666STREAM_LIVE_AUTHORITY=true
PFS_MUTATION_BY_666STREAM=false
PFS_NATIVE_666PFS_UPDATE_REQUIRED=true

Required logical backup children:
- 666STREAM_STRUCTURE_CONTROL
- 666STREAM_WEBRADIO
- 666STREAM_INTRO
- 666STREAM_WINDOWS_APP
- 666STREAM_LIGHT_ORCHESTRA

Each backup identity binds repository, project ID, workspace path, branch, commit, artifact, SHA256, readback, previous/current backup and rollback target.

BACKUP_IDENTITY=REPOSITORY+PROJECT_ID+WORKSPACE_PATH+COMMIT
CROSS_PROJECT_BACKUP_REUSE=FORBIDDEN
