uniform sampler2D optical_spectrum;
uniform bool optical_ready;

void mainImage(out vec4 pixel, in vec2 coords) {
    vec2 uv = coords / iResolution.xy;
    vec3 scene = vec3(.012, .008, .034);
    vec2 grid = abs(fract(uv * vec2(12, 8)) - .5);
    scene += vec3(.017, .023, .043) * smoothstep(.467, .498, max(grid.x, grid.y));
    if (optical_ready) {
        float x = clamp((uv.x - .04) / .92, 0., 1.);
        vec3 spectrum = texture(optical_spectrum, vec2(x, .5)).rgb;
        vec3 level = .11 + spectrum * (.67 + .095 * iMusicSync0);
        vec3 lines = exp(-abs(vec3(uv.y) - level) * (135. - 24. * iMusicSync2));
        float inside = smoothstep(.025, .045, uv.x) * (1. - smoothstep(.955, .975, uv.x));
        scene += inside * (lines.r * vec3(.02, .9, 1.) + lines.g * vec3(1., .15, .55)
                           + lines.b * vec3(.36, .28, 1.));
    }
    pixel = vec4(scene, 1.);
}
