# Release Verification — v1.2.4

- Release: `FULLVERSION_AMARIS_FULLSCREEN_AUTH_SKIP_5BAND_EQ_DISCORD_AUDIOSTABILITY_LEVELMETER_v1.2.4`
- Status: `LOCAL_REPAIR_PASS_LIVE_DEPLOYMENT_AND_DEVICE_AUDIO_VALIDATION_REQUIRED`
- Main player preserved: yes
- Internal emergency player preserved: yes
- AMARIS endpoint preserved and expanded: yes
- Secrets embedded in frontend: no

## Local verification

```text
npm run verify: PASS
check-release: PASS
node --test tests/*.test.mjs: 41 / 41 PASS
JavaScript-/MJS-Syntax: 111 PASS
Nested ZIP files: 0
Public mirror pairs: 56 PASS
```

## AMARIS v1.2.4 verified markers

- iPhone fullscreen viewport with no document scroll
- PC compact black-background mini-card
- protected Auto-DJ Skip button
- Discord Shooter button
- mobile-only Sound panel
- Boost `0–5`
- 5-band EQ `SUB / LOW / MID / HIGH / AIR`
- Audio-Stability handlers for visibility/page/focus return
- Bottom Levelmeter
- Main/Backup LED switch

## Required live validation after deployment

- Physical iPhone audio start and app-switch recovery
- Real Auto-DJ Skip through deployed PW/Auth/Admin worker chain
- Real Discord Shooter through deployed worker secrets
- Real stream fallback switching with production sources
