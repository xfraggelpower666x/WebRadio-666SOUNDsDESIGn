// Virtuelle Zonen und Panels für die Studio-Vorschau.
uniform sampler2D lifx_palette;
uniform bool palette_ready;

vec3 zonePalette(float phase) {
    if (palette_ready) {
        return texture(lifx_palette, vec2(fract(phase), .5)).rgb;
    }
    vec3 a = vec3(.09, .48, .53);
    vec3 b = vec3(.53, .27, .57);
    return max(a + b * cos(6.283185 * (phase + vec3(.13, .62, .91))), 0.0);
}

void mainImage(out vec4 pixel, in vec2 coordinates) {
    vec2 uv = coordinates / iResolution.xy;
    vec2 cells = uv * vec2(24.0, 12.0);
    vec2 index = floor(cells);
    vec2 local = abs(fract(cells) - .5);
    vec2 panel = (index + .5) / vec2(24.0, 12.0);
    float face = 1.0 - smoothstep(.37, .47, max(local.x, local.y));
    float halo = exp(-5.0 * dot(local, local));
    float drive = clamp(iMusicSync0 * .7 + iMusicSync1 * .3, 0.0, 1.0);
    float phase;
    float light;

#if LWT_MODE == 0
    // Aurora: Mehrere langsam wandernde Farbbänder laufen über die Panels.
    float wave = panel.y - .5 - .20 * sin(panel.x * 7.0 + iTime * .65);
    float curtains = exp(-17.0 * abs(wave)) + .44 * exp(-21.0 * abs(wave + .17));
    phase = panel.x * .38 + panel.y * .3 + iTime * .07 + .16 * iMusicSync2;
    light = .18 + curtains * (.68 + .38 * drive);
#elif LWT_MODE == 1
    // Farbkreislauf: Alle Panels teilen eine rotierende Palette mit räumlichem Versatz.
    phase = iTime * .14 + panel.x * .8 + panel.y * .25;
    light = .38 + .30 * sin(6.283185 * (panel.x - iTime * .26 + panel.y * .16))
          + .42 * drive;
#elif LWT_MODE == 2
    // Lauflicht: Helle Köpfe mit abfallender Spur, versetzt pro Reihe.
    float trail = fract(iTime * .65 - panel.x + panel.y * .43);
    phase = .16 + panel.y * .62 + trail * .31;
    light = .12 + (.74 + .42 * drive) * exp(-7.0 * trail);
#else
    // Puls: Die Helligkeit steigt entlang sanfter, radialer Wellen.
    float radius = length((panel - .5) * vec2(1.55, 1.0));
    float crest = .5 + .5 * cos(radius * (28.0 + 3.0 * iMusicSync1) - iTime * 4.2);
    phase = radius * .59 - iTime * .11;
    light = .15 + (.65 + .38 * drive) * pow(crest, 3.0);
#endif

    vec3 color = zonePalette(phase) * light * (.11 * halo + .89 * face);
    pixel = vec4(vec3(.012, .009, .031) + color, 1.0);
}
