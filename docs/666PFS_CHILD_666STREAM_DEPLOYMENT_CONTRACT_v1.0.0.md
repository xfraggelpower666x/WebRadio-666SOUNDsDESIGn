# 666PFS Child 666STREAM Deployment Contract
## Version 1.0.0

SYSTEM_ID=666PFS-666STREAM-DEPLOYMENT-001
PARENT_SYSTEM=666PFS
PARENT_SYSTEM_ID=666PFS-CORE-001
CHILD_NAMESPACE=666PFS/Child_Systems/666STREAM_DEPLOYMENT
CHILD_AUTOLOAD=FORBIDDEN
SECOND_BOOTSTRAP=FORBIDDEN
SECOND_UPDATE_ROUTE=FORBIDDEN
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
6. Allow the configured production deployment to complete.
7. Read back the live deployment marker and critical runtime assets.
8. Require `DEPLOYMENT_READBACK=PASS` and `FUNCTIONAL_VERIFICATION=PASS`.
9. Freeze the exact deployed repository tree.
10. Store MD + ZIP + SHA-256 as this 666PFS child release.
11. Read back the child backup and verify size, entries, CRC and SHA-256.
12. Update Registry and Menu.
13. Update the CURRENT Pointer last.

A repository archive created before production readback is only a candidate and must not be registered as a verified release.

## Authority split

- GitHub repository: technical code source of truth.
- Production readback: deployment success authority.
- 666PFS and 666CSM: child lifecycle, registry and backup authority.
- LYVRA: external and unchanged.

## Anti-layer rule

Do not cover an existing defect with a new override layer. Find and repair the responsible implementation. Remove obsolete duplicates only after evidence and verification.

## Failure states

The transaction stops without pointer promotion on missing permissions, active lock conflict, changed remote head, verification failure, deployment failure, live readback failure, backup write/readback failure, hash mismatch, ambiguous child identity, out-of-allowlist target or possible LYVRA impact.

## Definition of done

REPOSITORY_VERIFIED=PASS
GITHUB_UPLOAD=PASS
DEPLOYMENT=SUCCESS
DEPLOYMENT_READBACK=PASS
FUNCTIONAL_VERIFICATION=PASS
REPOSITORY_TREE_FREEZE=PASS
CHILD_BACKUP_WRITE=PASS
CHILD_BACKUP_READBACK=PASS
SHA256_VERIFIED=PASS
REGISTRY_UPDATED=PASS
MENU_UPDATED=PASS
CURRENT_POINTER_UPDATED_LAST=PASS
