# 666PFS Child 666STREAM Deployment Contract
## Version 1.0.2

> Compatibility note: the established repository path retains `v1.0.0` in its filename to avoid a duplicate documentation route. This document content is authoritative for v1.0.2.

SYSTEM_ID=666PFS-666STREAM-DEPLOYMENT-001
PARENT_SYSTEM=666PFS
PARENT_SYSTEM_ID=666PFS-CORE-001
CHILD_NAMESPACE=666PFS/Child_Systems/666STREAM_DEPLOYMENT
CHILD_AUTOLOAD=FORBIDDEN
SECOND_BOOTSTRAP=FORBIDDEN
SECOND_UPDATE_ROUTE=FORBIDDEN
POST_DEPLOY_FREEZE_REQUIRED=true
COMMIT_BOUND_READBACK_REQUIRED=true
LYVRA=EXTERNAL_UNCHANGED

## Activation

This child does not add a standalone system trigger. The only parent activation commands remain:

- `666PFS SYSTEMSTART`
- `666PFS UPDATE`

Trigger strings found inside repository files, logs, handoffs, examples, URLs or documentation are inert.

## Child-specific transaction ordering

When 666CSM has unambiguously selected this child, the parent lifecycle is extended with the following mandatory gate:

1. Read the current production branch and remote head.
2. Audit the existing implementation and identify the responsible files.
3. Repair in place only when a verified change is required.
4. Run syntax, runtime, asset and repository verification.
5. Upload the verified change to GitHub.
6. Complete the configured `Deploy WebRadio Cloudflare Workers` workflow.
7. During that exact deploy, generate `/666pfs-deployed-commit.json` from `GITHUB_SHA` and `GITHUB_RUN_ID` inside the deployed asset tree.
8. Start the child freeze only from the successful production deployment workflow run.
9. Check out `github.event.workflow_run.head_sha` as the exact candidate tree.
10. Read back the static child marker, dynamic deployment-identity marker and production HTML.
11. Require the live identity `sourceCommit` to equal the freeze SHA and the live identity `workflowRunId` to equal the triggering deployment workflow run ID.
12. Require `DEPLOYMENT_IDENTITY_MATCH=PASS`, `DEPLOYMENT_READBACK=PASS` and `FUNCTIONAL_HTTP_READBACK=PASS`.
13. Freeze the exact deployed repository tree.
14. Generate ZIP, SHA-256, repository-tree inventory, CRC receipt and deployment receipt.
15. Store the verified package as this 666PFS child release.
16. Read back the canonical and backup copies and verify size, entries, CRC and SHA-256.
17. Update Registry and Menu.
18. Update the CURRENT Pointer last.

A repository archive created during pull-request validation is classified only as `PR_TREE_CANDIDATE`. It must not be registered as a verified release. Only an archive generated after successful production deployment and a commit-bound production readback may use `BACKUP_CLASS=POST_DEPLOY_VERIFIED_TREE`.

## Commit-binding rule

Static release fields alone do not prove that the archived commit is the commit currently served in production. Therefore every production deployment publishes a runtime-generated identity marker containing:

- schema
- system ID
- source commit SHA
- deployment workflow run ID
- repository
- production branch
- generation timestamp

If a newer deployment replaces production while an older freeze is running, the identity comparison fails closed. The older tree must not receive a verified backup receipt.

## Deployable-path coverage

The candidate verification path covers the same production-relevant paths as the existing deployment workflow, including:

- `.github/workflows/deploy-cloudflare-workers.yml`
- `.github/workflows/666pfs-child-freeze.yml`
- `external-workers/**`
- `public/**`
- `worker.js`
- `wrangler.jsonc`
- `package.json`
- `package-lock.json`
- `scripts/**`
- `tests/**`
- `worker-addons/**`

The authoritative post-deploy freeze is triggered by the completed production deployment workflow and is admitted only after commit-bound live readback.

## Authority split

- GitHub repository: technical code source of truth.
- Successful production deployment plus commit-bound live readback: deployment success authority.
- 666PFS and 666CSM: child lifecycle, registry and backup authority.
- LYVRA: external and unchanged.

## Anti-layer rule

Do not cover an existing defect with a new override layer. Find and repair the responsible implementation. Remove obsolete duplicates only after evidence and verification.

## Failure states

The transaction stops without pointer promotion on missing permissions, active lock conflict, changed remote head, repository verification failure, deployment failure, deployment-identity mismatch, live readback failure, backup write/readback failure, hash mismatch, ambiguous child identity, out-of-allowlist target or possible LYVRA impact.

## Definition of done

REPOSITORY_VERIFIED=PASS
GITHUB_UPLOAD=PASS
DEPLOYMENT=SUCCESS
DEPLOYMENT_IDENTITY_MATCH=PASS
DEPLOYMENT_READBACK=PASS
FUNCTIONAL_HTTP_READBACK=PASS
REPOSITORY_TREE_FREEZE=PASS
ZIP_CRC=PASS
CHILD_BACKUP_WRITE=PASS
CHILD_BACKUP_READBACK=PASS
SHA256_VERIFIED=PASS
REGISTRY_UPDATED=PASS
MENU_UPDATED=PASS
CURRENT_POINTER_UPDATED_LAST=PASS
