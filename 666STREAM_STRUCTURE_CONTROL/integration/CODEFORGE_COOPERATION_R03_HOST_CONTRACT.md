# 666STREAM · CodeForge Cooperation R03 — host tool boundary

OWNER=666STREAM_STRUCTURE_CONTROL
PROJECT=WEBRADIO
NATIVE_EXECUTOR=666-RADIO-CODEFORGE-001
TECHNICAL_LEAD=LYVRA_CODING_PROFI
STATUS=SOURCE_CANDIDATE_REMOTE_HOST_ACCEPTANCE_OPEN
PARENT_R02=integration/stream-r02-native-cooperation-20261125
PRODUCTION_AUTOMERGE=FALSE
CLOUDFLARE_DEPLOY=FALSE
FOREIGN_AUTOACTIVATION=FALSE
FOREIGN_WRITES=FALSE

## Capability
- `radio-codeforge/cooperation/github-readonly-host.mjs` binds injected host `fetchFile`/`fetchBlob` callbacks to existing R02 `createBindingRegistry` and `executePlan`.
- Pinned repo, commit, path, blob SHA, repository allowlist, exact native commit and explicit read-only host authorization are mandatory.
- Git blob digest and separately returned blob are verified; mismatches fail closed.
- No network client, tokens, GitHub write methods, foreign mutation, paid provider provisioning, dynamic imports or deploys.
- Test callbacks are NOT live foreign plugin host connections. A separately observed GitHub connector read is a real connector operation but does not imply peer-plugin dispatch.

## Rehydration
After existing required_order and native project binding, load the R02 cooperation contract and this R03 adapter only when the user requests WEBRADIO CodeForge/development/audit work. Do not execute callbacks merely because the manifest was read. Existing R02 executor and canonical bridge remain authoritative and unchanged.

## Gates
1. Native HEAD and R02 pointer exact readback; isolate staging and preserve prechange backup.
2. Source regression, same-file GitHub blob verification, independent Release Integrity and RADIO-CODEFORGE CI.
3. Publish staged pointer last, stop writes thereafter.
4. Host acceptance requires injected authorized toolhandle and an independent provider readback. Foreign peer-host acceptance requires its own native evidence and receipt.
5. Productive WEBRADIO, Cloudflare, PR #262 and other native projects remain untouched.