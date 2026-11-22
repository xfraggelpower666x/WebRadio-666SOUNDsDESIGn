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

## 666AUDIO LIGHT WAVE

AUDIO_LIGHT_WAVE=KEEP_REACHABLE|WINDOWS_HOST_READBACK_PENDING

Eigenständiges Windows-Studio mit Einstieg unter `windows-app/666AUDIO-LIGHT-WAVE/README.md`. Die explizite Projektauswahl bindet die aktuelle Chat-Sitzung.


## WEBRADIO continuity — 2026-11-22
WEBRADIO=KEEP_ACTIVE_IN_THIS_CHAT
VERIFIED_RUNTIME_MERGE=db925dd115c889e43c45d96512b581fda2338d05
REPO_HEAD_AT_SYNC=b4debd9ec038d3be02103d5e5aea3b89478bf75a
LATER_CHANGES=WINDOWS_APP_ASUS_TEST_ONLY
RETURN_ANCHOR=WEBRADIO_HOST_ACCEPTANCE_PC_ANDROID_IPHONE_AND_ASUS_AURA_DEVICE_READBACK
CURRENT_RECEIPT=666STREAM_STRUCTURE_CONTROL/recovery/WEBRADIO_CURRENT_SYNC_20261122_R01.json
NO_CROSS_PROJECT_AUTOFOREGROUND=true
