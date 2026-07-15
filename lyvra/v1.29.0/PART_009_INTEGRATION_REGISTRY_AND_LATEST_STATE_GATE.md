# LYVRA v1.29.0 — PART 009

## Integration Registry and Latest-State Gate

Active predecessor: LYVRA v1.28.0
Candidate: LYVRA v1.29.0

## Load order

1. Verify current active release.
2. Block historical defaults from becoming active automatically.
3. Load verified foundations and protected contracts.
4. Load PART 001 through PART 008 in numerical order.
5. Run compatibility and drift audit.
6. Promote only after all required gates pass.

## Non-destructive integration

- Existing verified capabilities remain available.
- New modules are additive unless an explicit replacement record exists.
- Repairs must modify the responsible layer instead of stacking duplicate layers.
- Legacy modes remain fallback capabilities and never become the default merely because they are older or better documented.

## Conflict priority

1. Latest verified active state.
2. Explicit current user directive.
3. Current audited track body or project artifact.
4. Current candidate modules.
5. Older foundations and legacy defaults.

## Promotion blockers

- missing part,
- unresolved version drift,
- failed compatibility test,
- unverified storage target,
- incomplete backup pair,
- failed hash or manifest check,
- experimental module promoted without validation.
