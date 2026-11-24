# 666STREAM / WEBRADIO — CodeForge Cooperation R02

Status: `LOCAL_EXECUTOR_VERIFIED · REMOTE_PEER_DISPATCH_PENDING · NO_REPOSITORY_WRITE`

## Scope and preserved R01

R02 is an additive expansion of the actual R01 archive. All seven R01 file paths survive with their original content; the earlier 20 test cases are not replaced. Native 666STREAM / WEBRADIO and `666-RADIO-CODEFORGE-001` remain authoritative for project operations. **LYVRA Coding Profi leads the technical review and planning; it does not acquire foreign source write permissions.** All other CodeForge systems remain peers under their own authorities.

## Real executor capabilities

- `peer-executor.mjs`: actual asynchronous host callback dispatcher; invokes only bindings supplied explicitly by an authorized host; runs independent plan tasks in bounded parallel batches; prevents unapproved action types, scopes, unknown budgets, stale native commits, missing dependency evidence, mismatched receipts, overlong outputs, and accidental direct writes. It produces hashed execution receipts with per-task outcomes; unknown or failed host binding returns BLOCKED/PARTIAL, never success.
- `local-readonly-host.mjs`: concrete filesystem host adapter that really reads allowlisted local files. Symlink escape and parent traversal rejected using resolved real paths. This is a local capability, **not foreign plugin execution**.
- `run-local-readonly.mjs`: standalone real local readback demonstration, emitting only hashed receipts; no network, npm packages, credentials, file mutation, paid CI, or foreign activation.
- `tests/peer-executor.test.mjs`: 24 additional Node tests, including actual filesystem reads and parallel dispatch behavior. All 20 original R01 tests are retained.

## Run

Node 22+:

```sh
node --test tests/*.test.mjs
node radio-codeforge/cooperation/run-local-readonly.mjs
```

## Host binding contract

An eventual authorized plugin host must construct **real** explicit callable bindings through `createBindingRegistry` — one binding per peer/capability, with an allowlist of read scopes and `cost: 'VERIFIED_ZERO_EUR_NO_PAID_CREDITS'`. Their `invoke({task, evidence, signal})` must return an actual observation with exact taskId, exact nativeCommit, read-only operation, no mutation, no paid credit, zero additional cost, and a string output. A successful callback invocation does **not** alone prove that a remote peer accepted the task, nor that claimed costs were independently billed at zero: verify those independently before ever enabling remote connectors. No generic open-ended connector, arbitrary external JavaScript import, unrestricted file access, automatic fanout, or tool token is included.

This preserves the native `radio-codeforge/peers/lyvra-supercodeforge-peer-adapter.mjs` and the **single canonical bridge** `radio-codeforge/bridge/BRIDGE_REGISTRY.json`; no copy or rewrite. No new router; no production import from `radio-codeforge`.

## Known limits / safety

- R01 peer-catalog profiles remain **DECLARED**, not connected. Only the actual local filesystem adapter executes in this archive. The remote peer-host connector is *not installed or verified*; no claim of autonomous agents or real multi-plugin cooperation.
- Do not run unknown injected callbacks. They are privileged host capability boundaries, not security sandboxes; a malicious callback could lie about side effects. Verify the provider implementation and external account cost gate outside this library first.
- Existing R01 plan fingerprint, snapshot authority, collision rules and foreign-write denial preserved. The old observed current SHA may become stale; this sample is a local regression fixture, not live current.
- No production merge or Cloudflare deployment; PR #262 production hold preserved. No GitHub writes or CI runs in this package creation.
- Before native publication, independently verify fresh 666STREAM Current and any relevant peer Current/identity, backup, exact affected files, zero-extra-cost GitHub CI gate and host connectivity. Then targeted regression and independent GitHub readback. Pointer last, never after mutation.
