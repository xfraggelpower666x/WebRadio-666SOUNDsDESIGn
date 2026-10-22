# LIGHT ORCHESTRA — FORCE REPAIR FULL / R3 Deep Audit Checkpoint

Date: 2026-10-01
Scope: **source-only safety repair**, no device command was sent.
Production WebRadio branch: **not modified**; PR #231 remains draft.
Native development owner: WebRadio GitHub repository.
PFS LIGHT-35001 role: backup, readback and explicit-approval restore ONLY.

## Verified faults and change rationale

1. The prior Engine.set_power/set_color methods accepted manual commands despite Engine.enabled=False. They now reject with MASTER_DISABLED.
2. Registry entries were displayed but ignored by global power/color/audio and individual Govee test controls. Engine now applies registry selection before routing operations.
3. An OC21W discovered device may only be selected when its Windows BLE address is explicitly present in a selected registry entry. In this revision the local registry intentionally does not allow address editing; therefore OC21W hardware writes stay **blocked** while identity calibration is incomplete. Do not treat an iOS peripheral UUID as a Windows address.
4. The individual Govee color test is now checked against the master state, registry selection and the existing confirmed-LAN requirement.
5. Three new offline regression tests exercise global master-off, disabled device selection, and uncalibrated Bluetooth identity. Existing registry and safety tests remain.
6. Both native and root project copy files were updated together using the exact same Git blob SHA.

## Audits and limits

- Repository Release Integrity: completed SUCCESS on preceding safety-repair commit; this validates the general radio workflow and Python syntax, **not** the new Python unittest suite's execution.
- Radio CodeForge daemon: completed SUCCESS on preceding safety-repair commit.
- Python unittest execution: **PENDING** (source tests authored, not directly run in this session).
- Dedicated LIGHT ORCHESTRA workflow: authored; independent successful run **not confirmed**.
- Windows EXE, real H6047 UDP status, Magic Lantern OC21W and LENZE Bluetooth hardware: **PENDING**.
- H6047 first must return plausible devStatus reply from configured host; sends alone do not confirm receipt.
- OC21W command conflict 0xF0 vs 0x01 remains unresolved. No BLE writes automatically enabled.
- Repo forbids nested ZIP releases; backup archives must stay outside active repository tree.
- Development branch was behind production by two commits at initial audit. No forced rebase/merge.

## Release governance

R3 may be marked only as **SOURCE_FREEZE_CANDIDATE**, with archive CRC checks, manifest, canonical Drive and independent Backup Drive readbacks before publishing PFS registry/menu/pointer. A source freeze must not be promoted to Windows hardware or production release without actual tests. Keep all preceding R1/R2 backups as historic, not live authority.
