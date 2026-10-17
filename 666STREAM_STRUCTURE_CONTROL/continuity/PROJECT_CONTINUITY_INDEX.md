# 666STREAM Project Continuity Index

GLOBAL_ACTIVE_PROJECT=NONE
GLOBAL_ACTIVE_PROJECT_FORBIDDEN=true

WEBRADIO=KEEP_REACHABLE
INTRO=KEEP_REACHABLE
WINDOWS_APP=KEEP_REACHABLE
LIGHT_ORCHESTRA=KEEP_REACHABLE

Project foreground is resolved per chat session at runtime. This carrier must never be used as a global last-active selector.

## Additive project distinctions — 2026-10-17
GOVEE_CONTROL=KEEP_REACHABLE|SEPARATE_FROM_LIGHT_ORCHESTRA|CHECKPOINT_PARTIAL
INTRO_V1_10=KEEP_REACHABLE|FROZEN_AUDIT_PASS
INTRO_V1_5=KEEP_REACHABLE|REUSABLE_TEMPLATE
INTRO remains a compatible parent selector for these two separate variants, not a merge target. An explicit version selects its own current/return anchor. The Govee Controller uses projects/666-GOVEE-CONTROL/ and must not inherit LIGHT_ORCHESTRA's unverified child route. No cross-chat project autoactivation.
