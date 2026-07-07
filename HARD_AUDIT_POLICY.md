# HARD AUDIT POLICY — WebRadio-666SOUNDsDESIGn

## Status

**HARDLOCK ACTIVE — v1.2.0**

This policy is a release gate. A package is not releasable when any item below is `WATCH`, `REPAIR`, or `FAIL`.

## 1. Baseline verification

Before any change:

1. Load the exact documented baseline.
2. Run `npm run verify`.
3. Record the baseline result.
4. Classify every change as one of:
   - `DEVELOPMENT PROGRESS`
   - `EXECUTION ERROR REPAIR`
   - `VERIFICATION FAILURE REPAIR`
   - `REGRESSION REPAIR`
   - `SYSTEM DESIGN CHANGE`

Guessing a documented value is not development progress.

## 2. Fail-closed authorization

All protected admin routes must require:

- a valid Bearer token
- signature verification by the Auth Worker
- `iss === "666-system-pw"`
- `scope === "admin"`
- non-expired `exp`
- explicit same-origin evidence on state-changing browser requests

The following routes are hardlocked:

- `/api/admin/config/current`
- `/api/admin/config/backups`
- `/api/admin/config/update`
- `/api/admin/config/rollback`
- `/api/admin/skip`
- Discord write/test/debug routes

A health check is never authorization.

## 3. Single authentication authority

The browser may use only `window.S666AdminAuth` for protected actions.

Forbidden:

- redirects to an Auth Worker `/login` route
- `x-admin-password`
- parallel password caches
- direct password transmission to Skip or Discord routes
- Bearer token transmission to another origin

## 4. Worker-to-worker contract

PW Worker response:

```json
{
  "ok": true,
  "token": "...",
  "expiresAt": 0,
  "scope": "admin",
  "issuer": "666-system-pw"
}
```

Auth Worker response:

```json
{
  "ok": true,
  "valid": true,
  "payload": {
    "iss": "666-system-pw",
    "scope": "admin",
    "exp": 0
  }
}
```

`AUTH_SECRET` must be identical on both workers. `ADMIN_SERVICE_TOKEN` should be identical on the WebRadio, PW and Auth workers.

## 5. Single audio and meter authority

The audio graph order is fixed:

```text
audio source → analyser / MeterBus → visual meters → output gain / Boost
```

Forbidden:

- synthetic `Date.now()` meter motion
- Boost multiplication in meter calculations
- multiple automatic recovery owners
- a second analyser or AudioContext for the same player

`CentralAudioStabilityGuardV2` is the only automatic recovery authority.

## 6. Player Alert privacy and rate limiting

Rate limiting must use server-controlled request dimensions. A browser-provided `senderId` must not create a new rate bucket.

Forbidden in public or persisted message payloads:

- `rateKey`
- `rateIdentity`
- client fingerprint hashes

A production `PLAYER_ALERT_RATE_SALT` is required operationally, even though the code retains a compatibility fallback.

## 7. Source and deployment integrity

- Root and `public/` mirrors must be byte-identical.
- Root Worker and legacy Worker mirror must be byte-identical.
- No nested ZIP files.
- No committed secrets.
- No active legacy sender, auth or synthetic meter path.
- One atomic commit per release package.

## 8. Mandatory tests

The release must prove:

- correct PW→Auth login contract
- wrong issuer rejected
- wrong scope rejected
- expired token rejected
- write route without same-origin evidence rejected
- changing `senderId` does not bypass rate limiting
- no public `rateKey`
- no synthetic or Boost-driven meter code
- no legacy auth redirect/header
- all root/public mirrors match

## 9. Paid-test preflight gate

Before any cost-bearing deployment or external generation:

```text
ALL REQUIRED CHECKS = PASS
```

Any `WATCH`, `REPAIR`, or `FAIL` blocks the release.
