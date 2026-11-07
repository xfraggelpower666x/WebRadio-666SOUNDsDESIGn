# 666 LIGHT ORCHESTRA — DEEP AUDIT / REPAIR / RE-AUDIT / SOURCE FREEZE CANDIDATE

Date: 2026-10-01
Project status: **SOURCE_ONLY / v0.5.0-dev / NOT A HARDWARE OR PRODUCTION RELEASE**
Native GitHub repository: `xfraggelpower666x/WebRadio-666SOUNDsDESIGn`
Development branch: `feature/666-light-orchestra-v0.1.0`
Draft PR: #231
PFS record: `LIGHT-35001`, preservation and restore only, not runtime authority.

## Audited source facts

The native project is located at `tools/666-light-orchestra/`. Root mirror: `666-LIGHT-ORCHESTRA/`.
Two LENZE BLE controllers, four OC21W BLE controllers, Govee H6047 at user-reported `192.168.2.32`; Govee TV candidate excluded from active control.

## Deep-audit findings / repair

1. CRITICAL: Govee RGB/power were previously sent on configured IP without live probe proof. **REPAIRED:** successful read-only `devStatus` now required, expires after 300 seconds.
2. HIGH: Magic Lantern writes could be toggled by one config flag despite conflicting `0xF0` / `0x01` power frames. **REPAIRED:** three independent gates `write_enabled`, `protocol_verified`, Windows-BLE-address allowlist. Default remains blocked. This gating is NOT command validation.
3. HIGH: unrestricted browser Origin on localhost API. **REPAIRED:** explicit whitelist and Host checks; cross-origin wildcard removed. Current deployment URL must be confirmed from actual radio origin.
4. MEDIUM: audio swallowed adapter exceptions and still reported `ok:true`. **REPAIRED:** per-adapter failures exposed, including explicit adapter `ok:false` responses.
5. MEDIUM: high-frequency 90ms client could drive excessive Govee UDP send rates. **REPAIRED:** approximately 5 color-update batches/sec maximum per adapter. Device acknowledgement still not provided.
6. MEDIUM: GUI did not display top-level read-only LAN probe errors. **REPAIRED:** errors surfaced to user.
7. MEDIUM: generic source version `0.2.0` disagreed with `0.3.0/0.4.0` notes. **REPAIRED:** code and native README labeled `0.5.0-dev`. Historical audit document filenames remain unchanged.
8. LOW: HTTP JSON body accepted excessive sizes/non-object values. **REPAIRED:** 64KiB limit and JSON-object requirement.

## Offline tests and gates

- `tests/test_registry.py` covers inventory, persistence, schema failure, and block defaults.
- `tests/test_safety.py` tests simulation-only Govee guard/timeout/throttle, BLE gate, adapter errors and defaults.
- Dedicated `.github/workflows/light-orchestra-safe-audit.yml` added to run unittest, compile and make source ZIP artifact.
- Repository's existing Release Integrity workflow runs a general Python **syntax audit** and radio Node tests; its success is not equivalent to successful new Python unit tests.
- The dedicated LIGHT ORCHESTRA workflow must be observed **completed PASS** before asserting the new regression suite passed.
- No real Windows PC BLE scan, Govee LAN readback or Windows EXE smoke test performed.
- No real OC21W/LENZE BLE command verified; DO NOT enable writes.
- H6047 10-segment metadata remains external community indication, not device-calibrated proof.

## Freeze scope and invariant

The requested ZIP is a **source code snapshot / safety-review freeze candidate**, not a deployed release or Windows binary. Retain all source files and their Git blob SHAs in a manifest; verify ZIP integrity after creation. Do not publish an ACTIVE_HARDWARE_VERIFIED or DEPLOYED status. Existing production WebRadio and its worker must remain unmodified; feature branch only.

Native project retains execution and development authority. `LIGHT-35001` PFS stores version-bound backup and can only restore after explicit user approval and comparison against the newest verified GitHub source. Do not silently update PFS CURRENT until canonical/backups readback is complete.
