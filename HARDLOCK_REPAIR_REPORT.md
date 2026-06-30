# HARDLOCK REPAIR REPORT v1.2.0

## Classification

- Baseline: `FULLVERSION_AUDIT_REPAIR_v1.1.0`
- Output: `FULLVERSION_HARDLOCK_REPAIR_v1.2.0`
- Change class: `EXECUTION ERROR REPAIR + SECURITY HARDLOCK`
- Destructive replacement: **No**
- Protected stream/audio/backend systems retained: **Yes**

## Repairs applied

### Authentication and authorization

- Unified all protected frontend actions on `S666AdminAuth`.
- Removed legacy Auth Worker login redirect.
- Removed `x-admin-password` Skip path.
- Made issuer, scope and expiry mandatory for all admin configuration routes.
- Added same-origin evidence requirement to state-changing admin routes.
- Added safe error-code propagation for password and token failures.
- Added same-origin restriction to authorized browser fetches.
- Added deployable hardened PW/Auth Worker references.

### Meter and audio authority

- Removed synthetic time-driven meter animation.
- Removed Boost from side-meter level, peak, color and speed calculations.
- Removed the legacy automatic recovery installer.
- Removed the duplicate iPhone recovery authority.
- Kept CentralAudioStabilityGuardV2 as the single automatic recovery owner.

### Player Alert

- Removed browser-controlled `senderId` from the rate identity.
- Removed `rateKey` from new message payloads.
- Added response sanitization for old stored/backend payloads.
- Added tests proving sender-ID rotation cannot bypass the rate limit.

### Release hardlock

- Added `HARD_AUDIT_POLICY.md`.
- Added hardlock checks to `scripts/check-release.mjs`.
- Added auth integration, source hardlock and rate-limit regression tests.
- Added strict top-level-folder and manifest checks.

## Operational configuration required

The code cannot repair mismatched Cloudflare secrets automatically. Deployment must verify:

- identical `AUTH_SECRET` on PW and Auth Workers
- identical `ADMIN_SERVICE_TOKEN` on WebRadio, PW and Auth Workers
- `ADMIN_SERVICE_ORIGIN=https://webradio.666soundsdesign-broadcaster.com`
- `ALLOWED_ORIGIN=https://webradio.666soundsdesign-broadcaster.com`
- a production `PLAYER_ALERT_RATE_SALT`

## Release decision

Deployment is permitted only after `npm run verify` and the live PW/Auth integration checks both pass.


## Final local validation

- `npm run verify`: **PASS**
- Node tests: **34 passed / 0 failed**
- JavaScript syntax: **111 PASS**
- Python AST: **16 PASS**
- Root/Public mirror pairs: **54 PASS**
- npm audit: **0 known vulnerabilities**
- confirmed secret signatures: **0**
- nested ZIP files: **0**
- deployment performed: **No**

The local hardlock repair is complete. Production remains blocked until the mandatory live checks in `DEPLOYMENT_REQUIRED_CHECKS.md` pass.
