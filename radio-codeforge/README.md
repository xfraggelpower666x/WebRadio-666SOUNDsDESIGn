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
- analyzing repository topology and deployment relationships
- recommending improvements and further development
- preserving continuation from the last verified state
- checking radio-specific player, audio, metadata, reconnect, worker, CORS and Cloudflare risks
- enforcing the Radio-CodeForge isolation boundary

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

- `npm run radio:codeforge`
- `npm run verify`
- GitHub Actions workflow `.github/workflows/radio-codeforge-force.yml`
- tests that validate this boundary

The force daemon has no mutation authority over player, worker, configuration, deployment, or PFS state.
It may fail a development check when the isolation contract is violated.

## Automatic force behavior

The daemon is intentionally automatic in two places:

1. local/CI `npm run verify`
2. GitHub Actions on push and pull request

This makes RADIO-CODEFORGE run alongside radio development, audit and improvement work without entering the radio runtime.
