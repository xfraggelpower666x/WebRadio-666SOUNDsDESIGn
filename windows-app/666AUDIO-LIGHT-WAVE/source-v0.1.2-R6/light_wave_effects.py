"""Aufnehmbare Studio-Effekte aus Bestand und neuen Software-Visualisierungen."""
from light_wave_config import ROOT
from light_wave_export import HEIGHT, WIDTH
from light_wave_integrations import OPTICAL_EFFECT
from light_wave_shapes import FACE_EFFECT, SHAPE_EFFECT

EFFECTS = {
    "Spektrum": None,
    "Kaleidoskop": "caleidoscope_bufA.txt",
    "Vortex": "abstract_vortex_bufA.txt",
    "Matrix": "matrix_code_green_bufA.txt",
    "Fraktal-Nebel": "fractal_nebula_bufA.txt",
    "Cyberpunk": "cyberpunk_bufA.txt",
    "Mandala": "colorful_mandala_bufA.txt",
    "Regenbogen-Gitter": "3d_grid_rainbow_bufA.txt",
    "Fraktal-Tunnel": "fractal_tunnel_4_bufA.txt",
    "Sternenfeld": "color_star_field_bufA.txt",
    "Kristallnebel": "crystal_nebula_bufA.txt",
}
STUDIO_PASSES = {
    "Lichtzonen · Aurora": ("light_zones.glsl", 0),
    "Lichtzonen · Farbkreis": ("light_zones.glsl", 1),
    "Lichtzonen · Lauflicht": ("light_zones.glsl", 2),
    "Lichtzonen · Puls": ("light_zones.glsl", 3),
    "Optik · Interferenz": ("optical_fields.glsl", 0),
    "Optik · Beugung": ("optical_fields.glsl", 1),
    "Optik · Prisma": ("optical_fields.glsl", 2),
    "FFT · Spektrumring": ("geometry.glsl", 0),
    "Facetten · Neonmaske": ("geometry.glsl", 1),
    "B-Spline · Wellenbänder": ("geometry.glsl", 2),
    OPTICAL_EFFECT: ("imported_spectrum.glsl", 0),
}
EFFECT_NAMES = (*EFFECTS, *STUDIO_PASSES, SHAPE_EFFECT, FACE_EFFECT)
SHADER_DIR = ROOT / "DATA/shaders/music_video/v2"

HEADER = """#version 330
out vec4 studio_color;
uniform vec3 iResolution;
uniform float iTime;
uniform float iMusicSync0;
uniform float iMusicSync1;
uniform float iMusicSync2;
uniform float studio_gain;
uniform float studio_bass;

#line 1
"""
FOOTER = """
void main() {
    vec2 center = .5 * iResolution.xy;
    float zoom = 1.0 + .16 * studio_bass * studio_gain;
    vec4 scene = vec4(0, 0, 0, 1);
    mainImage(scene, center + (gl_FragCoord.xy - center) / zoom);
    float lighting = .76 + .24 * studio_gain + .10 * studio_gain * studio_bass;
    studio_color = vec4(clamp(scene.rgb * lighting, 0.0, 1.0), 1.0);
}
"""


def compile_effect(ctx, vertex, spectrum, name, size=(WIDTH, HEIGHT)):
    if name in STUDIO_PASSES:
        file, mode = STUDIO_PASSES[name]
        shader = (ROOT / "DATA/studio_effects" / file).read_text(encoding="utf-8")
        fragment = HEADER + f"#define LWT_MODE {mode}\n" + shader + "\n" + FOOTER
    elif EFFECTS[name] is None:
        fragment = spectrum
    else:
        shader = (SHADER_DIR / EFFECTS[name]).read_text(encoding="utf-8-sig")
        fragment = HEADER + shader + "\n" + FOOTER
    program = ctx.program(vertex_shader=vertex, fragment_shader=fragment)
    quad = ctx.vertex_array(program, [])
    if "iResolution" in program:
        program["iResolution"].value = (*size, 1.0)
    return program, quad


def set_effect_inputs(program, bands, elapsed, intensity):
    if "bands" in program:
        program["bands"].write((bands * intensity).clip(0, 1).tobytes())
        return

    if "studio_bands" in program:
        program["studio_bands"].write((bands * intensity).clip(0, 1).tobytes())

    bass = float(bands[:7].mean())
    mids = float(bands[7:18].mean())
    treble = float(bands[18:].mean())
    for name, value in (
        ("iTime", elapsed),
        ("iMusicSync0", bass * intensity),
        ("iMusicSync1", mids * intensity),
        ("iMusicSync2", treble * intensity),
        ("studio_gain", intensity),
        ("studio_bass", bass),
    ):
        if name in program:
            program[name].value = value
