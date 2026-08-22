# 666PFS Child 666STREAM External Link Contract
## Version 1.0.0

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

A selected verified release is not copied directly into production. The required recovery path is:

1. Resolve selector in external 666PFS.
2. Require a verified `POST_DEPLOY_VERIFIED_TREE` release.
3. Verify stored SHA-256 and release receipt.
4. Resolve the release `sourceCommit`.
5. Create a recovery branch from that exact commit.
6. Compare it against current production.
7. Run repository verification.
8. Open a reviewed pull request.
9. Require Release Integrity and 666PFS 666STREAM Child Freeze gates.
10. Merge only after green gates.
11. Deploy production normally.
12. Require commit-bound live readback.
13. Register the resulting state as a new verified child release.

This is a controlled restore transaction, not a blind rollback.

## Discovery rule

666PFS may discover this child through `/666pfs-child-release.json`, then follow `childLinkPath` to `/666pfs-child-link.json`.

The link manifest is descriptive and transactional only. It is not an executable parent bootstrap and must not create a second update route.
