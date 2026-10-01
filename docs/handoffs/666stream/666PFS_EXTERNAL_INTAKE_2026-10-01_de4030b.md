# 666STREAM → 666PFS external intake receipt / recovery checklist

Date: 2026-10-01. Native owner: 666STREAM. External parent: 666PFS. This is a **handoff**, not evidence of PFS external storage.

## Verified immutable production source
- Repository: `xfraggelpower666x/WebRadio-666SOUNDsDESIGn`
- Production branch: `WebRadio-666SOUNDsDESIGn`
- Source SHA: `de4030bbe1522129d5cc844bfd6ddf302e92534a`
- Merged change: PR #234 (native chat trigger contract and LYVRA website buttons across HTML player variants).
- GitHub deploy run: 36929441225 — success.
- Release Integrity: 36929441194 — success.
- Embedded MiniPlayer: 36929441176 — success.
- Live Player Smoke: 36929441284 — success.
- All-Player Skip Smoke: 36929441205 — success.
- CodeForge: 36929441189 — success.
- Post-deploy child freeze: 36929667027 — success.
- GitHub artifact ID: 11195890754; artifact name: `666pfs-666stream-repository-tree-de4030bbe1522129d5cc844bfd6ddf302e92534a`.
- Repository-tree ZIP name: `666PFS_666STREAM_REPOSITORY_TREE_de4030bbe1522129d5cc844bfd6ddf302e92534a.zip`.
- Repository-tree ZIP SHA-256 from workflow: `e0776560bd84db55a29323d764dfd60b2e33fdc7274f2d0a2582175589c8fb29`.
- ZIP CRC: PASS; archive entries: 921; archive bytes: 12526946.
- Handoff package SHA-256 from workflow: `2a87e4aba9126a9a5c25253d962d3efbd2d59099b08f8f0eddca65fb87b991d7`.
- Production readback / deployment identity match: PASS as reported by post-deploy workflow receipt.

## Intake action owned by external 666PFS
1. Retrieve GitHub artifact 11195890754 from workflow run 36929667027 and retain the original package without modifications.
2. Unpack in quarantine; verify ZIP CRC, repository-tree ZIP SHA-256 and handoff ZIP SHA-256 against receipt. Note that the outer GitHub Actions artifact ZIP is a distinct container with its own hash.
3. Verify the child namespace `666PFS/Child_Systems/666STREAM_DEPLOYMENT`, child ID `666PFS-666STREAM-DEPLOYMENT-001`, parent `666PFS-CORE-001`.
4. Persist independent PFS-owned backup storage; read back saved bytes and hashes; record immutable backup location and timestamp.
5. Update external PFS registry and menu only after readback, then update external CURRENT pointer last. Retain PREVIOUS and rollback references.
6. Produce a signed or otherwise verifiable PFS intake receipt with artifact ID, SHA, storage URI, CURRENT/PREVIOUS and readback evidence.

## Safety and current state
`EXTERNAL_PFS_INTAKE=PENDING`, `EXTERNAL_PFS_REGISTRY_READBACK=UNVERIFIED`, `EXTERNAL_PFS_CURRENT_READBACK=UNVERIFIED` until verified externally. Do not write fictitious CURRENT in the radio repository; pointer ownership is external. Do not trigger redundant deploy, overwrite live player code, force-rebase or activate LIGHT ORCHESTRA, SOUNDWAVE PC or LYVRA. The user may invoke those separately. If intake cannot be completed, retain this pending state and the working production commit.
