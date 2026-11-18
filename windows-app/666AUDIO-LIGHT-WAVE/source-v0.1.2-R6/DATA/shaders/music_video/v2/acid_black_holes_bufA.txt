// Fork of "black holes" by morisil. https://shadertoy.com/view/Nlt3DB
// 2021-11-11 17:50:05

// Fork of "depth of field focus study 4" by morisil. https://shadertoy.com/view/stdGzf
// 2021-11-11 17:35:53

// Fork of "depth of field focus study 3" by morisil. https://shadertoy.com/view/stdGRf
// 2021-11-09 22:06:23

// Fork of "depth of field focus study 2" by morisil. https://shadertoy.com/view/flc3zX
// 2021-11-09 21:23:07

// Fork of "depth of field focus study" by morisil. https://shadertoy.com/view/sld3zB
// 2021-11-08 19:52:49

const float CHROMATIC_ABBERATION = .02;
const float ITERATIONS = 20.;
const float INITIAL_LUMA = .5;

mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
}


float getColorComponent(in vec2 st, in float modScale, in float blur, in float shapeSize) {
    vec2 modSt = mod(st, 1. / modScale) * modScale * 2. - 1.;
    float dist = length(modSt);
    float angle = atan(modSt.x, modSt.y);
    float shapeMap = smoothstep(shapeSize + blur, shapeSize - blur, dist);
    return shapeMap;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 st =
        (2.* fragCoord - iResolution.xy)
        / min(iResolution.x, iResolution.y);
    st *= rotate2d(sin(iTime * .6 + st.x + st.y) * .3);
    st *= (sin(iTime * .3) + 2.) * .3;

    st *= log(length(sin(st * 5.18)) * cos(iTime * .1) + 1.2) * 5.;
    float modScale = 1.;

    vec3 color = vec3(0);
    float luma = INITIAL_LUMA;
    float blur = .2;
    float shapeSize = .2 + (sin(iTime * .7) + 1.) * .2;
    for (float i = 0.; i < ITERATIONS; i++) {
        vec2 center = st + vec2(sin(iTime * .5), cos(iTime * .3)) * 2.;
        //center += pow(length(center), 1.);
        vec3 shapeColor = vec3(
            getColorComponent(center - st * CHROMATIC_ABBERATION, modScale, blur, shapeSize),
            getColorComponent(center, modScale, blur, shapeSize),
            getColorComponent(center + st * CHROMATIC_ABBERATION, modScale, blur, shapeSize)        
        ) * luma;
        st *= 1.1;
        st *= rotate2d(sin(iTime  * .05) * .3);
        color += shapeColor;
        color = clamp(color, 0., 1.);
        if (color == vec3(1)) break;
        luma *= .8;
        blur *= .63;
    }
    fragColor = vec4(color, 1.0);
}