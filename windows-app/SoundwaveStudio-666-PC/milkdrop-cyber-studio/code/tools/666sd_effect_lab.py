"""666SOUNDsDESIGn Cyber Effect Lab R13.

Original EEL preset generator, independent of third-party shader implementations.
It does NOT compile HLSL or modify MilkDrop, and never overwrites a file.
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path

PALETTES = {
    "neon": (0.98, 0.07, 0.70),
    "cyan": (0.04, 0.90, 0.95),
    "violet": (0.63, 0.24, 0.96),
    "amber": (1.00, 0.43, 0.09),
    "acid": (0.29, 0.96, 0.30),
}
EFFECTS = {
    "tunnel": (
        "per_pixel_1=zoom=zoom+0.016*sin(rad*24-time*0.6);",
        "per_pixel_2=rot=rot+0.008*sin(ang*8+time*0.3);",
    ),
    "interference": (
        "per_pixel_1=dx=dx+0.008*sin(x*32+time*1.1);",
        "per_pixel_2=dy=dy+0.008*sin(y*27-time*0.8);",
    ),
    "vortex": (
        "per_pixel_1=rot=rot+0.012*sin(rad*18-time*0.5);",
        "per_pixel_2=zoom=zoom+0.010*cos(ang*6+time*0.2);",
    ),
    "pulse": (
        "per_pixel_1=zoom=zoom+0.013*cos(rad*20-time*0.9);",
        "per_pixel_2=dy=dy+0.005*sin(x*22+time*0.8);",
    ),
}
HEADER = """MILKDROP_PRESET_VERSION=200
PSVERSION=2
PSVERSION_WARP=0
PSVERSION_COMP=0
[preset00]
fRating=5.000
fGammaAdj=1.500
fDecay=0.972
fVideoEchoZoom=1.000
fVideoEchoAlpha=0.000
nVideoEchoOrientation=0
nWaveMode=2
bAdditiveWaves=0
bWaveDots=0
bWaveThick=1
bModWaveAlphaByVolume=0
bMaximizeWaveColor=0
bTexWrap=1
bDarkenCenter=1
bRedBlueStereo=0
bBrighten=0
bDarken=0
bSolarize=0
bInvert=0
fWaveAlpha=0.780
fWaveScale=0.850
fWaveSmoothing=0.720
fWaveParam=0.000
fModWaveAlphaStart=0.750
fModWaveAlphaEnd=0.950
fWarpAnimSpeed=1.000
fWarpScale=1.000
fZoomExponent=1.000
fShader=0.000
zoom=1.000
rot=0.000
cx=0.500
cy=0.500
dx=0.000
dy=0.000
warp=0.360
sx=1.000
sy=1.000
wave_x=0.500
wave_y=0.500
ob_size=0.004
ob_a=0.200
ib_size=0.005
ib_r=0.030
ib_g=0.030
ib_b=0.060
ib_a=0.120
nMotionVectorsX=16
nMotionVectorsY=12
mv_dx=0.000
mv_dy=0.000
mv_l=0.600
mv_a=0.060
wavecode_0_enabled=0
shapecode_0_enabled=0
wavecode_1_enabled=0
shapecode_1_enabled=0
wavecode_2_enabled=0
shapecode_2_enabled=0
wavecode_3_enabled=0
shapecode_3_enabled=0
"""


def generate(effect: str, palette: str, bpm: float = 146.0, intensity: float = 0.65) -> str:
    if effect not in EFFECTS:
        raise ValueError("Unsupported effect: " + effect)
    if palette not in PALETTES:
        raise ValueError("Unsupported palette: " + palette)
    if not (math.isfinite(bpm) and 60 <= bpm <= 220):
        raise ValueError("BPM must be finite and between 60 and 220")
    if not (math.isfinite(intensity) and 0 <= intensity <= 1):
        raise ValueError("Intensity must be finite and between 0 and 1")
    r, g, b = PALETTES[palette]
    lines = [HEADER.rstrip()]
    for name in ("wave", "ob", "mv"):
        lines.extend(f"{name}_{axis}={value:.6f}" for axis, value in zip("rgb", (r, g, b)))
    lines.extend([
        "per_frame_init_1=bass_smooth=0;",
        "per_frame_init_2=treb_smooth=0;",
        "per_frame_1=bass_smooth=0.88*bass_smooth+0.12*min(3,max(0,bass_att));q1=bass_smooth;",
        "per_frame_2=treb_smooth=0.88*treb_smooth+0.12*min(3,max(0,treb_att));q2=treb_smooth;",
        f"per_frame_3=phase=time*{2*math.pi*bpm/60:.6f};",
        f"per_frame_4=zoom=1+{0.018*intensity:.6f}*sin(phase)+{0.013*intensity:.6f}*q1;",
        f"per_frame_5=rot={0.011*intensity:.6f}*sin(time*0.37);",
        f"per_frame_6=warp=0.22+{0.21*intensity:.6f}*min(2,q2);",
        "per_frame_7=decay=0.970;",
        f"per_frame_8=wave_a=min(1,0.50+{0.19*intensity:.6f}*q1);",
        f"per_frame_9=wave_r=min(1,{r:.6f}*(0.7+0.2*q1));",
        f"per_frame_10=wave_g=min(1,{g:.6f}*(0.7+0.2*q2));",
        f"per_frame_11=wave_b=min(1,{b:.6f}*(0.7+0.2*q1));",
    ])
    lines.extend(EFFECTS[effect])
    return "\n".join(lines) + "\n"


def main() -> int:
    p = argparse.ArgumentParser(description="Non-destructive original MilkDrop effect builder")
    p.add_argument("--effect", choices=sorted(EFFECTS), default="vortex")
    p.add_argument("--palette", choices=sorted(PALETTES), default="neon")
    p.add_argument("--bpm", type=float, default=146.0)
    p.add_argument("--intensity", type=float, default=0.65)
    p.add_argument("--output", type=Path, required=True)
    args = p.parse_args()
    preset = generate(args.effect, args.palette, args.bpm, args.intensity)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8", newline="\n") as out:
        out.write(preset)
    print(json.dumps({"status": "CREATED", "path": str(args.output),
                      "effect": args.effect, "palette": args.palette}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
