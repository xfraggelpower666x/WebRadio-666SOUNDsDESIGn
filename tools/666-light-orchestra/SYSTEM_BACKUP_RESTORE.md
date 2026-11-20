# 666 LIGHT ORCHESTRA — SYSTEM BACKUP / RESTORE CONTRACT

Release class: SYSTEM_BACKUP_HARDWARE_UNVERIFIED

This backup is a repository-state safety package, not a hardware validation release.

## Included authority surfaces

- `666-LIGHT-ORCHESTRA/**` — native project source, tests, docs and Windows tooling.
- `tools/666-light-orchestra/**` — required exact source mirror.
- `.github/workflows/light-orchestra-safe-audit.yml`
- `.github/workflows/light-orchestra-windows-build.yml`
- matching `docs/LIGHT_ORCHESTRA_*.md` when present.
- `SYSTEM_BACKUP_MANIFEST.json` — SHA-256 inventory and source commit.

## Restore rules

1. Restore only into the LIGHT_ORCHESTRA paths recorded in the archive.
2. Do not replace or merge the production WebRadio tree from this backup.
3. Do not promote history/backup files to current authority when a newer valid LIGHT_ORCHESTRA current exists.
4. Re-run mirror verification, offline regression tests and Windows build validation after restoration.
5. Preserve local hardware evidence separately under the user's local LIGHT ORCHESTRA data directory; it is not silently promoted into repository authority.
6. Hardware gates remain fail-closed after restore.

## Hardware authority

The backup does NOT prove:
- Govee H6047 real end-to-end control,
- LENZE command frames,
- OC21W exact power-frame variant,
- Govee TV model/transport.

`hardware_verified=false`
`automatic_protocol_promotion=false`

## Non-destructive scope

The system backup must not mutate:
- production WebRadio,
- PFS,
- unrelated branches,
- secrets/tokens,
- connected hardware.

