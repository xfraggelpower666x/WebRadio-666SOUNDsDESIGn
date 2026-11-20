"""Non-destructive Composite Shader neon palette cycles.

Pure text transformation; NO GPU compile. Existing user shaders are never replaced.
"""
from __future__ import annotations
import re

PALETTES = (
    ("NEON PINK", (1.00, 0.15, 0.82)),
    ("LILAC", (0.71, 0.40, 1.00)),
    ("CYAN", (0.16, 0.96, 1.00)),
    ("ORANGE", (1.00, 0.50, 0.12)),
    ("GREEN", (0.20, 1.00, 0.46)),
)
TAG = "// 666SD_PALETTE_CYCLE_V1"
COMP_LINE = re.compile(r"(?m)^comp_(\d+)=(.*)$")


def palette_text(preset: str, palette_index: int) -> tuple[str, str]:
    """Create a new shaderless-preset variant or replace our own marked palette only.

    Explicit failure for foreign HLSL; no silent shader mutations.
    """
    if not re.search(r"(?m)^\[preset00\]\s*$", preset):
        raise ValueError("MilkDrop [preset00] section fehlt")
    label, (r, g, b) = PALETTES[palette_index % len(PALETTES)]
    shader = [
        "shader_body", "{", f"    {TAG}",
        "    // Neon palette mix; audio reactive, bounded to prevent blown highlights",
        f"    float3 neon = float3({r:.3f}, {g:.3f}, {b:.3f});",
        "    float pulse = saturate(0.70 + 0.12*(bass_att-1.0) + 0.07*(treb_att-1.0));",
        "    float3 original = tex2D(sampler_main, uv).xyz;",
        "    ret = saturate(original * lerp(float3(1.0,1.0,1.0), neon, 0.62) * pulse);",
        "}",
    ]
    matches = list(COMP_LINE.finditer(preset))
    if matches:
        if TAG not in "\n".join(m.group(2) for m in matches):
            raise ValueError("Fremder Composite-Shader: kein automatisches Überschreiben; zuerst explizit duplizieren und manuell bearbeiten")
        lines = preset.splitlines(keepends=True)
        lines = [ln for ln in lines if not re.match(r"^comp_\d+=", ln)]
        preset = "".join(lines).rstrip("\r\n") + "\n"
    elif re.search(r"(?m)^PSVERSION_COMP=(?!0\s*$)\d+", preset):
        raise ValueError("Preset deklariert einen Composite-Shader ohne lesbaren Code")
    for key, val in (("PSVERSION", "2"), ("PSVERSION_COMP", "2")):
        rgx = re.compile(rf"(?m)^{key}=.*$")
        preset, n = rgx.subn(f"{key}={val}", preset, count=1)
        if not n:
            preset = f"{key}={val}\n" + preset
    preset = preset.rstrip("\r\n") + "\n"
    preset += "".join(f"comp_{i}=`{line}\n" for i, line in enumerate(shader, 1))
    return preset, label
