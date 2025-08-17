#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform float uTemperature;
uniform float uTint;
uniform float uVignetteStrength;
uniform float uFilmGrainStrength;
uniform float uShadowsLift;
uniform float uHighlightsGain;

// NEW: Master intensity for cinematic grade
uniform float uCinematicIntensity;

// === Utility Functions ===

vec3 filmicToneMapping(vec3 color) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    color = (color * (a * color + b)) / (color * (c * color + d) + e);
    return clamp(color, 0.0, 1.0);
}

vec3 adjustTemperature(vec3 color, float temperature, float tint) {
    float tempR = 1.0 + temperature * 0.2;
    float tempB = 1.0 - temperature * 0.2;

    float tintG = 1.0 + tint * 0.15;
    float tintR = 1.0 - tint * 0.05;
    float tintB = 1.0 - tint * 0.05;

    color.r *= tempR * tintR;
    color.g *= tintG;
    color.b *= tempB * tintB;

    return color;
}

vec3 liftGammaGain(vec3 color, float lift, float gamma, float gain) {
    color = color + lift;
    color = pow(max(color, 0.0), vec3(1.0 / gamma));
    color = color * gain;
    return color;
}

vec3 cinematicGrade(vec3 color) {
    vec3 shadows = vec3(0.05, 0.1, 0.15);
    vec3 midtones = vec3(1.0, 0.95, 0.9);
    vec3 highlights = vec3(1.1, 1.05, 0.95);

    float luma = dot(color, vec3(0.299, 0.587, 0.114));

    float shadowWeight = 1.0 - smoothstep(0.0, 0.3, luma);
    float highlightWeight = smoothstep(0.6, 1.0, luma);
    float midtoneWeight = 1.0 - shadowWeight - highlightWeight;

    vec3 graded = color * (
        shadows * shadowWeight +
        midtones * midtoneWeight +
        highlights * highlightWeight
    );

    return mix(color, graded, uCinematicIntensity); // INTENSITY BLEND
}

float vignette(vec2 uv, float strength) {
    vec2 center = uv - 0.5;
    float dist = length(center);
    float falloff = 1.0 - smoothstep(0.3, 0.8, dist);
    float v = mix(1.0, 1.0 - strength, 1.0 - falloff);
    return mix(1.0, v, uCinematicIntensity); // INTENSITY BLEND
}

float filmGrain(vec2 uv, float time) {
    float noise = fract(sin(dot(uv + time * 0.1, vec2(12.9898, 78.233))) * 43758.5453);
    return noise;
}

void main() {
    vec2 uv = vUv;
    vec4 originalColor = texture(uTexture, uv);
    vec3 color = originalColor.rgb;

    // 1. Exposure
    color *= uExposure;

    // 2. Shadows / Highlights
    color = liftGammaGain(color, uShadowsLift, 1.0, uHighlightsGain);

    // 3. Temperature / Tint
    color = adjustTemperature(color, uTemperature, uTint);

    // 4. Cinematic Color Grading
    color = cinematicGrade(color); // wrapped with intensity inside

    // 5. Contrast
    color = (color - 0.5) * uContrast + 0.5;

    // 6. Saturation
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luminance), color, uSaturation);

    // 7. Tone mapping
    color = filmicToneMapping(color);

    // 8. Vignette
    float v = vignette(uv, uVignetteStrength);
    color *= v;

    // 9. Film grain
    float grain = filmGrain(uv * uResolution, uTime);
    color += (grain - 0.5) * uFilmGrainStrength * uCinematicIntensity;

    // 10. Clamp
    color = clamp(color, 0.0, 1.0);

    fragColor = vec4(color, originalColor.a);
}
