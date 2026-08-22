# 666PFS Child 666STREAM External Link Contract
## Version 1.0.2 — Historical Restore Control Preservation + Base Revalidation Repair

SYSTEM_ID=666PFS-666STREAM-DEPLOYMENT-001
PARENT_SYSTEM=666PFS
PARENT_SYSTEM_ID=666PFS-CORE-001
CHILD_NAMESPACE=666PFS/Child_Systems/666STREAM_DEPLOYMENT
LINK_MODE=EXTERNAL_PARENT_LINK_ONLY
REPOSITORY_ROLE=CHILD_SOURCE_AND_RELEASE_IDENTITY_ONLY
PFS_CORE_IN_REPOSITORY=FORBIDDEN
666CSM_CORE_IN_REPOSITORY=FORBIDDEN
CHILD_AUTOLOAD=FORBIDDEN
SECOND_BOOTSTRAP=FORBIDDEN
SECOND_UPDATE_ROUTE=FORBIDDEN
DIRECT_PRODUCTION_RESTORE=FORBIDDEN
LYVRA=EXTERNAL_UNCHANGED

## Purpose

This repository does not become the 666PFS or 666CSM runtime. It only publishes a stable link manifest for the already defined 666STREAM child. The parent systems remain external and authoritative for menu, selector, registry and pointer state.

Public link manifest:

- `/666pfs-child-link.json`

Existing child release marker:

- `/666pfs-child-release.json`

Commit-bound deployment identity:

- `/666pfs-deployed-commit.json`

## Ownership split

### Radio repository owns

- technical repository source
- production branch identity
- child system ID and namespace
- commit-bound deployment identity
- verified freeze artifact naming convention
- restore safety contract

### External 666PFS owns

- CURRENT pointer
- PREVIOUS pointer
- PINNED pointer
- named release registry
- release menu
- durable backup copy
- selector resolution

### External 666CSM owns

- unambiguous selection of this child before any child transaction
- target validation and routing

The repository must never store the 666PFS core or the 666CSM core merely to support this link.

## Selectors

The child link advertises these selector names to the external parent:

- `CURRENT`
- `PREVIOUS`
- `PINNED`
- `NAMED_RELEASE`

The repository does not resolve those selectors. `selectorResolution=PFS_EXTERNAL_REGISTRY` is mandatory.

## Restore control preservation hardlock

Historical payloads are allowed to restore historical radio source files, but they are not allowed to downgrade or remove the current restore-control contract itself.

The following control paths are preserved from the recorded current Production head and must be reapplied after historical-tree materialization:

- `public/666pfs-child-link.json`
- `public/666pfs-child-release.json`
- `docs/666PFS_CHILD_666STREAM_EXTERNAL_LINK_CONTRACT_v1.0.0.md`
- `tests/666pfs-child-external-link-contract.test.mjs`

The restore host must snapshot these current Production control files before materializing the historical payload. After materialization it must reapply the snapshot and verify that the resulting control files match the recorded current Production versions before creating the explicit restore commit.

If any required current control file cannot be preserved, reapplied or verified, the restore fails closed. A historical release may never reintroduce an older ancestor-based restore contract or remove the child link contract.

## Production base revalidation hardlock

At restore start, the host must read and record the exact current Production HEAD SHA. The recovery branch must be based on that recorded SHA.

Immediately before merge, after all required gates are green, the host must read Production HEAD again and require exact equality with the recorded base SHA.

If Production HEAD changed while the restore PR was open:

1. Do not merge the stale recovery branch.
2. Fail closed.
3. Read and record the new Production HEAD.
4. Recreate or reset the recovery transaction from that new current Production state.
5. Re-snapshot the current restore-control files.
6. Re-materialize the selected verified historical tree.
7. Reapply and verify the current restore-control files.
8. Recreate the explicit restore commit.
9. Re-run repository verification, PR review and required gates.
10. Merge only after Production still equals the newly recorded base SHA immediately before merge.

This prevents unrelated Production changes from being silently merged into or lost from a historical restore.

## Restore transaction

A selected verified release is not copied directly into production and a recovery branch must not be based directly on an older ancestor commit.

The required recovery path is:

1. Resolve selector in external 666PFS.
2. Require a verified `POST_DEPLOY_VERIFIED_TREE` release.
3. Verify stored SHA-256 and release receipt.
4. Resolve the release `sourceCommit` only as the verified historical tree source.
5. Read and record the exact current Production HEAD SHA.
6. Snapshot the current restore-control files from that recorded Production SHA.
7. Create the recovery branch from the recorded current Production SHA.
8. Materialize the complete verified selected-release tree on that recovery branch.
9. Reapply the current Production restore-control files listed above.
10. Verify the reapplied control files match the recorded current Production versions.
11. Create an explicit restore commit representing historical payload plus preserved current restore controls.
12. Compare that recovery commit against the recorded current Production SHA.
13. Reject an empty restore PR unless the selected verified tree is already identical to current production, in which case no restore is required.
14. Run repository verification.
15. Open a reviewed pull request.
16. Require Release Integrity and 666PFS 666STREAM Child Freeze gates.
17. Immediately before merge, re-read Production HEAD and require it to equal the recorded base SHA.
18. If it differs, fail closed and rematerialize the restore from the new Production HEAD before any merge.
19. Merge only after green gates and exact Production-base match.
20. Deploy production normally.
21. Require commit-bound live readback.
22. Register the resulting state as a new verified child release.

This is a controlled restore transaction, not a blind rollback. Historical selectors are fail-closed if the host cannot preserve current restore controls, materialize an explicit restore commit on top of current production, or prove the Production base remained unchanged through merge time.

## Discovery rule

666PFS may discover this child through `/666pfs-child-release.json`, then follow `childLinkPath` to `/666pfs-child-link.json`.

The link manifest is descriptive and transactional only. It is not an executable parent bootstrap and must not create a second update route.
