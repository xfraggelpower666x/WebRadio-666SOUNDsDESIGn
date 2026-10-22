# LENZE RGB + OC21W Protocol Design Blueprint

Status: **SOFTWARE-CONCEPT COMPLETE / HARDWARE VERIFICATION PENDING**

This blueprint intentionally separates protocol design from device validation.

## Common architecture

1. **Discovery** — find only expected BLE name prefixes.
2. **Identity binding** — Windows BLE address must be mapped to the known local registry entry.
3. **Capability model** — power, RGB, brightness, mode, speed, notify, audio-reactive.
4. **Intent layer** — effects and audio analysis create device-agnostic command intents.
5. **Protocol planner** — converts an intent into either a candidate frame plan or an explicit unresolved state.
6. **Safety governor** — no real write unless protocol verification and identity allowlist both pass.
7. **Hardware adapter** — the only layer allowed to call Bleak write operations.
8. **Readback/observation** — notifications and real-device behavior are stored as evidence, not guessed as success.

## LENZE RGB

Current known software evidence:
- Prefix: `LENZE-RGB`
- Service: FFF0
- Write: FFF3
- Notify: FFF4
- Expected controllers: 2
- Discovery and notification capture already implemented.

Current deliberate unknown:
- Power/color/brightness frame encoding.

Therefore LENZE is now modeled as a full capability target, but its planner returns
`needs_protocol_capture` instead of inventing OC21W frames.

### LENZE validation sequence
- discover both controllers on Windows
- bind Windows addresses to `lenze_1` / `lenze_2`
- connect read-only and capture characteristics/notifications
- observe official-app command traffic if available
- infer candidate frame schema
- replay only one low-risk command after explicit validation approval
- confirm behavior and rollback
- only then mark each capability VERIFIED

## OC21W

Current candidate software model:
- Prefix: `OC21W`
- Service: FFF0
- Write: FFF3
- Notify: FFF4
- Expected controllers: 4
- Candidate frame family: `7E <len> <cmd> <5 payload bytes> EF`
- Candidate commands exist for power, RGB, brightness, mode and speed.

These are **candidate-only** encodings. The software may generate and test them offline,
but may not treat them as hardware verified.

### OC21W validation sequence
- discover all 4 Windows BLE addresses
- bind addresses to `oc21w_1..4`
- capture read-only service/characteristic layout
- resolve current power-frame conflict
- compare candidate frames with real app traffic / observation
- validate one controller first
- then validate remaining controllers individually
- only after per-capability proof promote protocol verification

## Audio-reactive layer

Audio mapping is protocol-independent:
- energy -> brightness envelope
- bass/kick -> pressure-biased RGB intent
- drop -> neon-pink accent intent
- mid/high -> secondary color movement

LENZE and OC21W receive the same abstract intent; only the protocol adapter differs.
This prevents duplicated effect logic and lets both families evolve independently.

## Hard rule

**CONCEPT != VERIFIED HARDWARE.**

The project can be considered architecturally implemented before hardware access,
while all physical writes remain fail-closed until evidence promotes the relevant
protocol/capability to VERIFIED.
