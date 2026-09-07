# 666 RADIO-CODEFORGE

Status: RADIO-NATIVE / DEVELOPMENT ASSISTANT / NON-INFILTRATING

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

RADIO-CODEFORGE runs in parallel with WebRadio development and assists by:

- observing repository state and changed files
- checking repository/deployment relationships
- enforcing the Radio-CodeForge isolation boundary
- surfacing risky development areas
- preserving continuation evidence
- running read-only integrity checks during normal verification and CI

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

This makes RADIO-CODEFORGE run alongside radio development without entering the radio runtime.
