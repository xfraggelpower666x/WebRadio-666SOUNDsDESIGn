// Eigenentwickelte OpenGL-3.3-Szenen für die gemeinsame Studio-Audioanalyse.
uniform float studio_bands[28];
const vec3 neonCyan = vec3(.04, .87, 1.0);
const vec3 neonPink = vec3(1.0, .12, .55);
const vec3 neonPurple = vec3(.48, .14, 1.0);

float bandAt(float band) {
    return studio_bands[int(clamp(band, 0.0, 27.0))];
}

float stroke(float distance, float width) {
    return exp(-abs(distance) / width);
}

float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    return length(p - a - clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0) * ab);
}

float spline(float u, float a, float b, float c, float d) {
    float v = 1.0 - u;
    return (v*v*v*a + (3.0*u*u*u - 6.0*u*u + 4.0)*b
            + (-3.0*u*u*u + 3.0*u*u + 3.0*u + 1.0)*c + u*u*u*d) / 6.0;
}

void mainImage(out vec4 pixel, in vec2 coords) {
    vec2 uv = coords / iResolution.xy;
    vec2 p = (coords - .5 * iResolution.xy) / min(iResolution.x, iResolution.y);
    vec3 color = vec3(.010, .006, .029) + neonPurple * .08 * exp(-4.0 * length(p));

#if LWT_MODE == 0
    // Das FFT-Spektrum erzeugt 56 gespiegelte Lichtsegmente auf einem Ring.
    float radius = length(p);
    float phase = fract(atan(p.y, p.x + .00001) / 6.2831853 + iTime * .028);
    float sector = phase * 56.0;
    float index = floor(sector);
    float power = bandAt(min(index, 55.0 - index));
    float inner = .20 + .019 * iMusicSync0;
    float outer = inner + .025 + .16 * power;
    float dash = 1.0 - smoothstep(.32, .46, abs(fract(sector) - .5));
    float tip = smoothstep(inner - .005, inner, radius) *
                (1.0 - smoothstep(outer, outer + .006, radius));
    vec3 hue = mix(neonCyan, neonPink, .5 + .5 * cos(phase * 6.2831853));
    color += hue * dash * tip * (.36 + .75 * power);
    color += neonPurple * .27 * stroke(radius - inner + .017, .009);
    color += neonCyan * .15 * stroke(radius - .09, .013);
#elif LWT_MODE == 1
    // Facettenmaske mit Audio-Verformung und digitaler Kantenbeleuchtung.
    vec2 q = p;
    q.x -= .04 * sin(iTime * .88);
    q.y += .045;
    q /= 1.0 + .22 * iMusicSync0;
    q.x = abs(q.x);
    vec2 forehead = vec2(.14, .29);
    vec2 temple = vec2(.255, .16);
    vec2 cheek = vec2(.20, -.07);
    vec2 jaw = vec2(.128, -.23 - .04 * iMusicSync1);
    vec2 chin = vec2(0.0, -.32 - .05 * iMusicSync0);
    vec2 nose = vec2(0.0, -.025);
    float outline = min(segmentDistance(q, forehead, temple), segmentDistance(q, temple, cheek));
    outline = min(outline, min(segmentDistance(q, cheek, jaw), segmentDistance(q, jaw, chin)));
    outline = min(outline, segmentDistance(q, forehead, vec2(0, .32)));
    float facets = min(segmentDistance(q, temple, nose), segmentDistance(q, cheek, nose));
    facets = min(facets, min(segmentDistance(q, jaw, nose), segmentDistance(q, forehead, nose)));
    float eye = segmentDistance(q, vec2(.07, .092), vec2(.188, .118));
    float mouth = segmentDistance(q, vec2(0, -.14), vec2(.090, -.145 - .018 * iMusicSync1));
    color += mix(neonCyan, neonPink, smoothstep(-.19, .21, q.y)) * stroke(outline, .0055);
    color += neonPurple * stroke(facets, .005 + .004 * iMusicSync2) * .59;
    color += neonCyan * stroke(eye, .012 + .007 * iMusicSync2);
    color += neonPink * stroke(mouth, .006);
#else
    // Kubische B-Splines verbinden Frequenzstützpunkte zu drei kontinuierlichen Bändern.
    float t = clamp(uv.x, .0, .99999) * 27.0;
    float n = floor(t);
    float u = fract(t);
    float level = spline(u, bandAt(n-1.0), bandAt(n), bandAt(n+1.0), bandAt(n+2.0));
    for (int ribbon = 0; ribbon < 3; ++ribbon) {
        float k = float(ribbon);
        float wave = sin(uv.x * (7.0 + k * 2.5) + iTime * (1.5 + k * .28) + k * 2.0);
        float y = .40 + k * .10 + (.052 + .14 * level) * wave;
        float line = stroke(uv.y - y, .0045 + .002 * iMusicSync2);
        vec3 hue = mix(neonCyan, neonPink, k * .5);
        color += hue * (.68 * line + .14 * stroke(uv.y - y, .028));
    }
#endif
    pixel = vec4(color, 1.0);
}
