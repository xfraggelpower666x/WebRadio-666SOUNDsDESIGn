# LYVRA v1.29.0 — PART 011

## Photorealism Framework Replacement

Replacement source: 666_PHOTOREALISMUS_GENERATOR_v1_9_0_LEAN_PHOTOREAL_RECONSTRUCTION_STABLE.zip
Source SHA-256: 5ed1a0bd7fd4c88f92d916c7af96cb845bc0530621bb57635717347c05cb2ead
Package verification: PASS — 189 hashed files
Source active runtime: v1.9.0
Integration class: EXPLICIT REPLACEMENT

## Replacement decision

The previous LYVRA photorealism framework logic is classified as faulty and must no longer be the active default. The v1.9.0 Lean Photoreal Reconstruction logic replaces it as the authoritative photorealism path.

The previous implementation remains isolated as LEGACY/FALLBACK only. It must never auto-activate and must not be layered underneath or above v1.9.0.

## Active reconstruction logic

1. Use the dedicated CGI_TO_PHOTOREAL_RECONSTRUCTION profile for CGI, game-render, 3D or synthetic source imagery.
2. Compile no more than four creative prompt blocks.
3. Use a minimal identity anchor instead of duplicated identity-lock paragraphs.
4. Permit full visual reconstruction of skin, hair, anatomy rendering, materials, lighting, depth, water and reflections while preserving the source subjects and requested composition.
5. Apply identity-drift control after generation through result validation instead of overblocking the generation prompt before execution.
6. Include only environment, material, text and anatomy constraints that are directly relevant to the current edit.

## Removed mandatory prompt behavior

- duplicated IDENTITY_CORE_LOCK block,
- unconditional FRAMELESS_STAGE1 block,
- unconditional NO_UNAUTHORIZED_TEXT block,
- oversized anatomy wording,
- redundant environment and material blocks,
- stacked legacy photorealism guards that duplicate the same restriction.

## Runtime authority

The following v1.9.0 components define the authoritative execution behavior:

- ACTIVE/19_HOST_TURN_EXECUTOR.py
- ACTIVE/28_HOST_RESULT_EXECUTOR.py
- ACTIVE/26_PROMPT_COMPILER.py
- ACTIVE/27_VISUAL_QA_ENGINE.py
- ACTIVE/25_CANONICAL_RESOLVER.py
- ACTIVE/33_CHARACTER_TRANSFORMATION_DIRECTOR.py
- ACTIVE/34_CREATIVE_RUNTIME_PROFILES.json

## Validation evidence

- Canonical Resolver: PASS
- Runtime Validator: PASS
- Deep Acceptance: 43/43 PASS
- Mirror consistency: repaired
- Creative prompt maximum: four blocks
- Duplicate identity prompt lock: removed
- CGI/3D reconstruction mode: active

## Integration guard

This is a replacement at the responsible framework layer, not an additive parallel layer. Existing valid LYVRA identity, storage, recovery and latest-state gates remain active. Any older photorealism logic conflicting with this part is subordinate and inactive.
