# 666PFS Child 666STREAM External Link Contract
## Version 1.0.1 — Historical Restore P1 Repair

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

## Restore transaction

A selected verified release is not copied directly into production and a recovery branch must not be based directly on an older ancestor commit. Doing that can create a branch with no commits ahead of production and therefore an empty pull request.

The required recovery path is:

1. Resolve selector in external 666PFS.
2. Require a verified `POST_DEPLOY_VERIFIED_TREE` release.
3. Verify stored SHA-256 and release receipt.
4. Resolve the release `sourceCommit` only as the verified tree source.
5. Read the current production HEAD.
6. Create the recovery branch from current production HEAD.
7. Materialize the complete verified selected-release tree on that recovery branch.
8. Create an explicit restore commit representing the selected tree.
9. Compare that recovery commit against current production.
10. Reject an empty restore PR unless the selected verified tree is already identical to current production, in which case no restore is required.
11. Run repository verification.
12. Open a reviewed pull request.
13. Require Release Integrity and 666PFS 666STREAM Child Freeze gates.
14. Merge only after green gates.
15. Deploy production normally.
16. Require commit-bound live readback.
17. Register the resulting state as a new verified child release.

This is a controlled restore transaction, not a blind rollback. Historical selectors are fail-closed if the host cannot materialize an explicit restore commit on top of current production.

## Discovery rule

666PFS may discover this child through `/666pfs-child-release.json`, then follow `childLinkPath` to `/666pfs-child-link.json`.

The link manifest is descriptive and transactional only. It is not an executable parent bootstrap and must not create a second update route.
