// Stilisierte zweidimensionale Lichtfelder für die Studio-Vorschau.
float lwtGaussian(float distance, float width) {
    float z = distance / width;
    return exp(-z * z);
}

void mainImage(out vec4 pixel, in vec2 coordinates) {
    vec2 p = (coordinates - .5 * iResolution.xy) / iResolution.y;
    vec3 cyan = vec3(.08, .85, 1.0);
    vec3 pink = vec3(1.0, .16, .58);
    vec3 violet = vec3(.46, .18, 1.0);
    vec3 rgb = vec3(.012, .008, .031);

#if LWT_MODE == 0
    // Zwei kreisförmige Wellenfronten treffen sich mit veränderlicher Phasendifferenz.
    float spacing = .21 + .10 * clamp(iMusicSync0, 0.0, 1.0);
    float left = length(p + vec2(spacing, 0));
    float right = length(p - vec2(spacing, 0));
    float wave = sin(42.0 * left - iTime * 2.7) / (1.0 + 1.6 * left)
               + sin(42.0 * right - iTime * 2.7 + .9 * sin(iTime) + 3.0 * iMusicSync1)
                 / (1.0 + 1.6 * right);
    float intensity = .36 * wave * wave;
    rgb += intensity * mix(cyan, pink, .5 + .5 * sin(10.0 * (left - right)));
#elif LWT_MODE == 1
    // Einzelspaltmuster: sinc²-Maxima hinter der Öffnung, mit sichtbaren Nebenmaxima.
    float travel = max(p.x + .28, .025);
    float aperture = .047 + .027 * clamp(iMusicSync0, 0.0, 1.0);
    float axis = p.y + .018 * sin(iTime * 1.2) + .04 * iMusicSync1;
    float angle = axis / sqrt(travel * travel + axis * axis);
    float arg = 145.0 * aperture * angle;
    float amplitude = abs(arg) < .001 ? 1.0 : sin(arg) / arg;
    float pattern = amplitude * amplitude * lwtGaussian(axis, .09 + .38 * travel);
    float front = .67 + .33 * cos(64.0 * travel - iTime * 5.5);
    rgb += mix(violet, cyan, front) * pattern * front * smoothstep(-.30, -.24, p.x);
    rgb += pink * .78 * lwtGaussian(p.x + .28, .012) * (1.0 - smoothstep(aperture, aperture + .018, abs(p.y)));
    rgb += cyan * .55 * lwtGaussian(p.y, .021) * (1.0 - smoothstep(-.32, -.27, p.x));
#else
    // Prisma: Ein Eingangsstreifen fächert sich in farbige Strahlen auf.
    float prismX = -.10;
    float travel = p.x - prismX;
    float wobble = .025 * sin(iTime * 1.4);
    float openAngle = .30 + .20 * clamp(iMusicSync1, 0.0, 1.0);
    float entrance = (1.0 - smoothstep(-.025, .025, travel)) * lwtGaussian(p.y - wobble, .018);
    rgb += (cyan * .5 + vec3(.43)) * entrance;
    for (int beam = 0; beam < 7; ++beam) {
        float lane = float(beam) / 6.0;
        float y = wobble + (lane - .5) * openAngle * max(travel, 0.0);
        float width = .011 + .007 * clamp(iMusicSync2, 0.0, 1.0);
        float ray = lwtGaussian(p.y - y, width) * smoothstep(-.025, .025, travel);
        vec3 hue = .53 + .47 * cos(6.283185 * (lane * .72 + vec3(.05, .67, .34)));
        float ripple = .74 + .26 * cos(24.0 * travel - iTime * 4.0 + lane * 5.0);
        rgb += hue * ray * ripple * (.57 + .13 * iMusicSync0);
    }
    float edge = abs(abs(p.y) + .60 * (p.x - prismX) - .11);
    rgb += .19 * violet * lwtGaussian(edge, .010) * (1.0 - smoothstep(.12, .16, abs(travel)));
#endif

    pixel = vec4(rgb, 1.0);
}
