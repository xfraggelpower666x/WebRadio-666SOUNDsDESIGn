# 666STREAM · CodeForge Cooperation R02 — native project-bound integration

OWNER=666STREAM_STRUCTURE_CONTROL
EXECUTOR=666-RADIO-CODEFORGE-001
ACTIVE_SCOPE=WEBRADIO
ROLE=DEVELOPMENT_ONLY
FACHLEITUNG=LYVRA_CODING_PROFI
NATIVE_AUTHORITY_TRANSFER=FORBIDDEN
CROSS_SYSTEM_WRITES=FORBIDDEN
FOREIGN_AUTOACTIVATION=FORBIDDEN
PRODUCTION_RUNTIME_IMPORT=FORBIDDEN
AUTO_DISPATCH=FALSE
ZERO_ADDITIONAL_COST_POLICY=REQUIRED_PER_EXTERNAL_ACTION
SOURCE_STATUS=R02_LOCAL_VERIFIED_44_OF_44
REMOTE_HOST_STATUS=READBACK_PENDING
REPOSITORY_PUBLICATION_STATUS=READBACK_PENDING

## Existing source owner and links

- Structure authority: `666STREAM_STRUCTURE_CONTROL/CURRENT_POINTER.json`, `REHYDRATION_MANIFEST.json`, `current/PROJECT_MAP.json` and the requested project-specific continuities.
- Existing executor/validator: `radio-codeforge/force-daemon.mjs` + `radio-codeforge/radio-codeforge.config.json`.
- Reused LYVRA peer evidence gate: `radio-codeforge/peers/lyvra-supercodeforge-peer-adapter.mjs`.
- Reused binary transfer registry: `radio-codeforge/bridge/BRIDGE_REGISTRY.json`.
- Additive R02 code: `radio-codeforge/cooperation/coop-core.mjs`, `peer-executor.mjs`, `peer-catalog.json`.

## Rehydration behavior

After the mandatory `REHYDRATION_MANIFEST.json.required_order`, and after the active project is bound from `current/PROJECT_MAP.json`, load this contract *only when development, audit, review, repair, or CodeForge work is requested*. Continue with `radio-codeforge/README.md` and source files. Do not automatically launch peer tools, connect accounts, dispatch callbacks or run jobs on SYSTEMSTART.

R02 catalog roles are declared capability descriptions, not proof that six foreign plugin actions have been installed and connected. An external host must supply explicit callable `createBindingRegistry` entries scoped to WEBRADIO, read only, and independently verified for zero additional charges/no paid credits. If proof is absent, stop before external invocation (`COST_BLOCKED`). `executePlan` receipts prove invoked callbacks only; a remote peer's own host acceptance needs an independent receipt.

## Release gates

1. Verify current production branch and pointer against immutable commit; never replace newer valid state.
2. Backup before repository mutation and check write authority, target, lock, and branch.
3. Stage source-only additions and native references on isolated branch.
4. Run focused local tests (`node --test tests/coop-core.test.mjs tests/peer-executor.test.mjs`) before external CI.
5. No GitHub CI triggering push until owner-approved provider cost gate is satisfied; no production push.
6. Verify remote commit/tree/blobs, update the native Current pointer **last** with exact receipt, then stop writes for this update.
7. Keep 666STREAM WEBRADIO PR #262 draft and Cloudflare production hold. A source-only candidate cannot count as a deployed plugin or automated peer-dispatch verification.

## Current boundaries

R02 is development-only. It must not be imported by `public/`, `js/`, `worker.js` or any production module. No shared mutable ledger or cross-repository authority. CLIC, 666DEV, MAIN BRAIN, LYVRA and other peers remain separate native owners.
