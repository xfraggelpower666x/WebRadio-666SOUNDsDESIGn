# SOUND CONTROL OVERLAY V1 — 2026-05-25

## Built

```text
- PC + iPhone Sound Control Overlay
- 9-band EQ UI
- Booster controls in the same overlay
- 3 local preset slots
- Save / Reset / Close
- Dirty-state save confirmation
- localStorage state
- iPhone trigger via 3D EQ / bottom visualizer tap
- PC trigger via SOUND LED button
```

## Important implementation note

The module does not create a second AudioContext.

It bridges to the existing real WebAudio chain by controlling the existing hidden EQ inputs and Booster buttons.

The old bottom EQ is hidden visually but kept in the DOM as audio bridge.

## localStorage keys

```text
s666_sound_control_state_v1
s666_sound_control_preset_v1_1
s666_sound_control_preset_v1_2
s666_sound_control_preset_v1_3
smfp_real_eq_v162
```
