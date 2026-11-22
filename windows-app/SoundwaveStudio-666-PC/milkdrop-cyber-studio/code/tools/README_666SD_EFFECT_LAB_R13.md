# 666SOUNDsDESIGn — Cyber Effect Lab R13

**Source:** original user-directed effect mathematics; no XorDev GPL/proprietary shaders copied.
**Authority:** `xfraggelpower666x/MilkDrop3`, development branch
`666sd-cyberstudio-direct-r09-20261106`. Main was not changed.

## Run on Windows

```bat
CYBER_EFFECT_LAB_666SD.bat
```

The menu offers four selectable presets and the existing read-only library audit.
Python 3.x is needed for these tools; the GPU renderer is separate.
The menu writes unique `.milk` presets under `reports/` and never overwrites
a filename (`open('x')`).

Direct CLI:

```bat
py -3 code\tools\666sd_effect_lab.py --effect vortex --palette neon --bpm 146 --intensity 0.65 --output "reports\my_unique_name.milk"
py -3 -m unittest discover -s code\tools -p "test_666sd_*.py" -v
```

Note: Python `unittest discover` does not discover filenames with numeric
prefix by default, so the explicit `-p` pattern is required.

## Real implemented features

- 4 original per-pixel EEL effect families: vortex, tunnel, pulse, interference
- 5 original RGB palettes: neon pink, cyan, violet, amber, acid green
- Configurable BPM and bounded intensity
- Music-reactive `bass_att` and `treb_att` in per-frame equations
- Legacy MilkDrop-compatible preset text output; no HLSL shader recompile required
- Reuses the existing R09 library audit and its original-byte SHA-256 reporting
- Non-destructive output (exclusive create, never overwrite)

## External source findings

- XorDev website, Arsenal, FragCoord and GM Shaders: inspiration and reference only;
  no external code vendored; review individual licensing before import.
- MilkDropLM 32B alpha: separate optional language model; no model weights or
  automatic downloads, no inference charges, no runtime dependency.
- Spout2: native Windows GPU interface remains a separate build gate.
- Shadertoy N3VXz1: use as mathematical research reference only; specific
  code licensing and renderer compilers require validation.

## Real verification gates

1. GitHub write/readback validates source persistence, NOT execution.
2. Python tests should execute in the intended Windows Python installation.
3. MilkDrop3 launch and GPU rendering/visual inspection must be tested on host.
4. Shader compilation, hot reload, GPU texture sharing, WASAPI app capture,
   browser-tab capture, overlay, monitor selection and portable installer remain OPEN.
5. Avoid flashing/high intensity defaults and test photosensitivity safety.
6. Retain R10-R12 Windows bootstrap repair continuity independently of this effect tool.

## Return anchors

- Baseline original repository main HEAD: `6b39088f789441e18cc1665519ee7ffe439cece5`
- R09 source/tools and R10 host log analysis retained.
- R13 changes additive on existing R09 development branch only.
- No auto-merge or production promotion, no model downloads, no extra costs.
