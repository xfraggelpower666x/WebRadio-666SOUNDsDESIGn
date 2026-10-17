# 666STREAM Semantic Visual Intelligence — Host Acceptance Gates
OWNER=666STREAM_STRUCTURE_CONTROL
STATUS=REQUIRES_FRESH_HOST_OBSERVATION
NODE_COMPONENT_EVIDENCE=666STREAM_STRUCTURE_CONTROL/recovery/VISUAL_NODE_COMPONENT_RUN_2026-10-17.json
CORE_TEST_ENTRYPOINT=npm run verify:stream-core
VISUAL_TEST_ENTRYPOINT=npm run verify:stream-visual

## Scope
Presentation-only native visual facet. Repository files, JSON contracts and isolated Node tests do not prove a fresh ChatGPT-host renderer loaded them. Do not declare HOST_PASS from generated cards in the authoring chat.

## Source / Node verification
- Verify current HEAD, CURRENT_POINTER and actual source blob identities.
- In a full checked-out GitHub repository run `npm run verify:stream-visual` (both visual test files) and `npm run verify:stream-core` (all scoped core, CodeForge and visual tests). Capture exact node version, exit status, TAP counts, commit and logs.
- The existing isolated Node component run passed 6/6 with source/test/contract exact Git blob equality but only reduced dependency fixtures. It is not a full-repository test pass.

## Actual fresh-host acceptance (manual user actions; no invented simulator)
1. Open a genuinely fresh conversation in the 666STREAM project. Invoke `666STREAM SYSTEMSTART`; verify current and project selection are shown without cross-chat foreground inheritance. Record source Current and what was actually rendered.
2. Invoke `666STREAM DASHBOARD` or `666STREAM VORNE`. Verify actual native UI shows repository identity, scope, last verified return anchor, status evidence and current choices.
3. Invoke `666STREAM UPDATE` or `666STREAM WEITER`; ensure final user-visible message includes at least one actionable continuation choice when evidence supports it. If no valid choices exist it must show a clear BLOCKED cause and correct return anchor, not a fake clickable element.
4. Click one actually rendered continuation button. Verify it invokes the correct next turn/copy/open action, retains the same session scope, and does not claim actions that were never executed.
5. Open `666STREAM MASTER BRIDGE HANDOFF`; verify separate LYVRA/CLIC cards, four distinct SOURCE/DELIVERY/ADOPTION/HOST evidence lanes, real copy action, no foreign autoactivation and no fake peer receipt.
6. Record observed host surface, action, source HEAD, outcome and independent proof (actual turn content / action result) before declaring FRESH_HOST_PASS. An authored UI contract or a link alone is not host acceptance.

## Failure/recovery
If a host cannot render native controls, use plain-text exact continuation without presenting fake buttons. If host acceptance is missing or diverges from source, status is READBACK_PENDING or BLOCKED with a scoped return anchor. Never mutate foreign systems or production radio to fix a presentation failure.
