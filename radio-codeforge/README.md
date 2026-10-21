# 666 RADIO-CODEFORGE

Status: RADIO-NATIVE / ACTIVE DEVELOPMENT ASSISTANT / NON-INFILTRATING

## Identity

666 RADIO-CODEFORGE is the radio project's own development-assistance system.
It is not 666CODEFORGE and it is not the PFS CodeForge child.

Hard boundary:

- RADIO-CODEFORGE != 666CODEFORGE
- RADIO-CODEFORGE != PFS-CODEFORGE-CHILD
- source identity import is forbidden
- source trigger import is forbidden
- source authority import is forbidden
- source namespace import is forbidden

## Purpose

RADIO-CODEFORGE runs in parallel with WebRadio development and actively assists by:

- understanding the current repository delta before development decisions
- developing with evidence instead of blind rewrites
- auditing every material change
- verifying before promotion
- finding root causes and recommending repairs
- detecting duplicate owners, stale layers and competing state writers before adding another fix
- auditing Root/Public mirror consistency when mirrored files are involved
- planning regression coverage before promotion
- analyzing repository topology and deployment relationships
- recommending improvements and further development
- preserving continuation from the last verified state
- checking radio-specific player, audio, metadata, reconnect, worker, CORS and Cloudflare risks
- enforcing the Radio-CodeForge isolation boundary

## Chat-host development integration

RADIO-CODEFORGE has two complementary development surfaces. They are deliberately separate and both are required for normal radio-code work.

### 1. Chat / host development layer

When radio code is being analyzed, repaired, extended or prepared for repository changes in a capable chat/host environment, the host applies the RADIO-CODEFORGE development contract automatically.

This is not a claim that a second autonomous process is running inside the chat. The host must actively apply the RADIO-CODEFORGE rules as a development co-pilot and audit layer.

Required sequence:

1. rehydrate the current verified repository/project state
2. inspect the current delta and authoritative owner before changing anything
3. perform root-cause analysis
4. audit duplicate owners, stale layers, timers, observers and competing writers
5. prefer minimal cause-first repair over another overlay or parallel owner
6. audit mirrored Root/Public files when applicable
7. define regression coverage for the discovered failure mode
8. perform controlled repository changes
9. re-audit/read back the result
10. hand the resulting commit/PR to the independent GitHub RADIO-CODEFORGE Force Daemon
11. require Release Integrity before promotion/merge

The chat-host layer does not receive production, deployment, PFS or autonomous mutation authority from RADIO-CODEFORGE. Repository writes still use the host's explicitly available/authorized repository tools and normal project authority.

### 2. GitHub Force Daemon

The GitHub workflow remains an independent second validation layer. It is not replaced by the chat-host development layer and must not be treated as evidence that the pre-change architecture/root-cause audit happened in chat.

The intended development chain is therefore:

`Chat analysis -> RADIO-CODEFORGE host audit -> cause-first repair -> regression plan/test -> controlled repo write/PR -> GitHub RADIO-CODEFORGE Force Daemon -> Release Integrity -> promotion`

The machine-readable host contract is stored in `radio-codeforge/radio-codeforge.config.json` under `chatHostIntegration`.

## Learning from live 666CODEFORGE

666CODEFORGE is a learning source only. RADIO-CODEFORGE adapts useful capabilities into radio-native behavior without importing 666CODEFORGE identity, triggers, namespace or authority.

Adapted capability families include:

- force rehydration principle
- interruption/resume continuity
- current-before-history
- evidence-before-pass
- audit -> repair -> re-audit
- repository topology analysis
- root-cause-before-rewrite
- research-before-repair
- deployment relationship analysis
- continuity daemon principle
- readback-after-mutation
- history/supersession awareness

The machine-readable learning contract is stored in `radio-codeforge/learning-profile.json`.

## Codex emergency escalation

Codex may be used as an emergency development helper when RADIO-CODEFORGE cannot safely resolve a difficult blocker itself.

Default order:

1. RADIO-CODEFORGE understands and attempts the repair itself.
2. Audit/research/repair is retried with evidence.
3. After three serious failed attempts, or when complexity exceeds safe local resolution, the daemon may emit `RADIO_CODEFORGE_CODEX_ESCALATION=RECOMMENDED`.
4. Codex assistance is routed through an available host/chat/Codex environment; the GitHub daemon does not silently impersonate or invoke Codex.
5. Codex has no source, production, deployment or PFS authority.
6. Every Codex result must return to RADIO-CODEFORGE for review, audit and revalidation before promotion.

## Non-infiltration law

RADIO-CODEFORGE must never become part of the runtime radio/player/worker code path.
Production source must not import, require, execute, bundle, fetch, or dynamically load files from `radio-codeforge/`.

Allowed integration points are development-only:

- chat/host application of the machine-readable RADIO-CODEFORGE development contract
- `npm run radio:codeforge`
- `npm run verify`
- GitHub Actions workflow `.github/workflows/radio-codeforge-force.yml`
- tests that validate this boundary

The force daemon has no mutation authority over player, worker, configuration, deployment, or PFS state.
It may fail a development check when the isolation contract is violated.

## Automatic force behavior

RADIO-CODEFORGE is intentionally automatic in three development contexts:

1. chat/host radio development: host applies the RADIO-CODEFORGE development contract before and during material radio-code changes
2. local/CI `npm run verify`
3. GitHub Actions on push and pull request

This keeps RADIO-CODEFORGE involved from architecture/root-cause analysis through final independent CI validation without entering the radio runtime.

## Canonical artifact bridge reuse — 2026-10-17
The existing universal bridge contract at `radio-codeforge/bridge/UNIVERSAL_ARTIFACT_BRIDGE_CONTRACT_v1.md` is the sole reusable artifact-transfer capability. Its machine-readable descriptor is `radio-codeforge/bridge/BRIDGE_REGISTRY.json`. Always discover and reuse it before suggesting or creating any new transport implementation. Per-task manifests and readback receipts are not new bridges.
CodeForge's development/audit daemon is separate from the transport adapter and does not gain write/deployment authority from reuse governance. Current transport status is PREPARED_NOT_LIVE_TESTED; host execution must not be reported as PASS without direct independent evidence.

## Preserve → Understand → Refine → Apply → Verify → Learn — 2026-10-21
RADIO-CODEFORGE applies the repo-wide 666STREAM evolution policy from `666STREAM_STRUCTURE_CONTROL/AUTHORITY_CONTRACT.md` in every active project scope. Start with the verified current plus relevant history and operational baseline; reconstruct WHY existing code and fallbacks work before proposing implementation. Prefer the original owner, its proven behavior and minimal tuning over rebuilds, duplicate controllers or unnecessary additional sources. Distinguish source inspection, hypotheses, synthetic tests, measured real-host outcomes and unverified runtime claims. If no causal defect or measurable improvement is established, perform no production mutation. After authorized bounded change, compare the same scenario against baseline, preserve contradictions, tests, readback and a resumable return anchor. This reuses the existing host contract, force daemon and local-learning loop; it neither creates a new daemon nor grants independent write authority.

## MAX_3_CHECKS_THEN_LEARNING_BY_DOING — 2026-10-17
A native, scope-bound RADIO-CODEFORGE development policy adapted from CLIC/LYVRA learning practices without importing their authority.

- At most **three nonredundant discovery checks of the same hypothesis** before an evidence-backed implementation decision. Repeated identical checks do not reset the counter or count as productive progress.
- After three checks, shift from speculative auditing to the **smallest safe reversible implementation or experiment**, measure the actual result and update the causal explanation.
- If a protected write is not authorized, its prerequisites are missing, or risks remain uncontrolled, report **BLOCKED** with findings and a resumable next action. Never equate learning-by-doing with permission to force a write.
- Required currentness/permission/concurrency checks, pre-change backup, security tests, regression tests, post-change readbacks and pointer-last publication are **not subject to the 3-check ceiling**.
- Record hypothesis, checks already performed, results, attempted action, observed outcome, contradicting evidence and next return anchor so NEW/NEXT CHAT or WEITER does not repeat the same three checks.
- This is independent of `codexEscalation.triggerAfterSeriousFailedAttempts=3`, which counts *failed repair attempts*, not discovery checks. Learning evidence stays 666STREAM-local and can never rewrite CLIC/LYVRA knowledge.
