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

## Current verified CI baseline / unfinished host handoff — 2026-10-17
FULL_REPOSITORY_CORE_NODE_CI=PASS_34_OF_34_AT_COMMIT_3330957bcda839b336572de937f7e8bb360bb03f
INDEPENDENT_ACTIONS_RUN=39007506095
CORE_CODEFORGE=PASS_22_OF_22
VISUAL_COMPLETION=PASS_12_OF_12
OLDER_33_OF_33_PASS=PRESERVED
ORIGINAL_ZIP_DIRECT_GITHUB_TRANSPORT=PASS_9123_BYTES_EXACT_REMOTE_READBACK
GOVEE_PRODUCTION_IMPORT=NONE
ACCOUNT_PLUGIN_RELEASE_ID=UNRESOLVED
NATIVE_PLUGIN_RELEASE_ID=UNRESOLVED
FRESH_HOST_PASS=NOT_CLAIMED
OPTIONAL_WINDOWS_OFFLINE_FALLBACK=NOT_REQUIRED_WHILE_DIRECT_GITHUB_TRANSPORT_WORKS; EXECUTION_NOT_TESTED

Genuine fresh-host acceptance still requires a **new 666STREAM project chat**. Invoke `666STREAM SYSTEMSTART` and verify real current, native project-selection choices and non-foreground of unrelated projects. Then invoke `666STREAM DASHBOARD`, choose one actually rendered native action and inspect the received follow-up turn. Maintain a stable scoped CORE return anchor. Capture any actual independent host action/turn receipt before accepting HOST_PASS. A pasted action prompt alone does not establish a native button-click event.

Existing visual test command includes three test files: semantic visual enforcement, master handoff and Symphony project identity. Earlier isolated 6/6 checks are historical, not a replacement for the actual 34/34 GitHub Actions run. Never rerun or roll back already accepted CI merely to satisfy another host gate.
