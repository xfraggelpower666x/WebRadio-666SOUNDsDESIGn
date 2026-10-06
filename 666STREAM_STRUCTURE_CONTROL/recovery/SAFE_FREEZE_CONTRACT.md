# 666STREAM Structure Control Safe Freeze Contract

STATUS=ACTIVE
SYSTEM_ID=666STREAM_STRUCTURE_CONTROL
FREEZE_SCOPE=666STREAM_STRUCTURE_CONTROL_ONLY
AUTHORITY=GITHUB_REPOSITORY
AUTHORITY_BRANCH=WebRadio-666SOUNDsDESIGn

## Hard safety rules

- The production radio runtime is not mutated by a Structure Control freeze.
- No ZIP or other binary recovery archive is committed inside the active radio source tree.
- A systemsicherung ZIP is generated only as an immutable GitHub Actions artifact.
- The ZIP excludes `CURRENT_POINTER.json`; pointer authority is published after artifact verification.
- Every archive contains a SHA-256 manifest and must pass ZIP CRC plus per-file SHA-256 readback.
- The workflow rejects any candidate commit that changes paths outside:
  - `666STREAM_STRUCTURE_CONTROL/**`
  - `.github/workflows/666stream-structure-safe-freeze.yml`
- `npm run verify` must pass before a structure freeze artifact may be accepted.
- No deploy command is permitted in the safe-freeze workflow.
- Existing production deployment and radio worker files remain untouched.
- A newer verified repository state always supersedes older recovery artifacts.
- Restore is structure-scoped and must not roll back another repository project.
- PFS/CSM remains backup/recovery registry; it is not live 666STREAM authority.

## Pointer-last sequence

BODY_COMMIT
→ SCOPE_GUARD
→ RADIO_VERIFY
→ STRUCTURE_AUDIT
→ ZIP_BUILD
→ ZIP_CRC
→ FILE_SHA256_READBACK
→ ARTIFACT_UPLOAD
→ ARTIFACT_READBACK
→ CURRENT_POINTER_COMMIT_LAST

The pointer stores artifact identity, body commit and SHA-256 evidence. It never points to a nonexistent in-tree ZIP.
