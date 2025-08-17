#version 300 es
precision highp float;

in vec2 vLocalPos;
out vec4 fragColor;

uniform float uTime;
uniform int uState;
uniform float uFormProgress;

uniform float uWallThickness;
uniform vec3 uBaseColor;
uniform vec3 uPulseColor;
uniform vec3 uStreamColor;

const vec3 FIRE_BRIGHT = vec3(1.0, 0.1, 0.05);
const vec3 FIRE_MID    = vec3(0.9, 0.3, 0.1);
const vec3 FIRE_DARK   = vec3(0.4, 0.02, 0.0);
const float INNER_RADIUS = 0.6;
const float NOISE_FREQUENCY = 0.05;

// --- Hash and Noise ---
vec3 generateHash(vec3 p) {
    p = fract(p * vec3(0.1031, 0.11369, 0.13787));
    p += dot(p, p.yxz + 19.19);
    return fract(vec3(p.x + p.y, p.x + p.z, p.y + p.z) * p.zyx) * 2.0 - 1.0;
}

float simplexNoise(vec3 position) {
    const float SKEW = 1.0 / 3.0;
    const float UNSKEW = 1.0 / 6.0;

    vec3 i = floor(position + dot(position, vec3(SKEW)));
    vec3 x0 = position - i + dot(i, vec3(UNSKEW));

    vec3 g1 = step(x0.yzx, x0.xyz);
    vec3 l1 = 1.0 - g1;
    vec3 i1 = min(g1, l1.zxy);
    vec3 i2 = max(g1, l1.zxy);

    vec3 x1 = x0 - i1 + UNSKEW;
    vec3 x2 = x0 - i2 + 2.0 * UNSKEW;
    vec3 x3 = x0 - 1.0 + 3.0 * UNSKEW;

    vec4 t = max(0.6 - vec4(
        dot(x0,x0),
        dot(x1,x1),
        dot(x2,x2),
        dot(x3,x3)
    ), 0.0);
    t *= t * t * t;

    vec4 grad = vec4(
        dot(generateHash(i + vec3(0,0,0)), x0),
        dot(generateHash(i + i1), x1),
        dot(generateHash(i + i2), x2),
        dot(generateHash(i + vec3(1,1,1)), x3)
    );

    return dot(t, grad) * 5.1;
}

// --- Helpers ---
float linearAttenuation(float intensity, float falloff, float distance) {
    return intensity / (0.5 + distance * falloff);
}

float quadraticAttenuation(float intensity, float falloff, float distance) {
    return intensity / (1.0 + distance * distance * falloff);
}

vec4 premultiplyAlpha(vec3 color) {
    float alpha = clamp(max(max(color.r, color.g), color.b), 0.0, 1.0);
    return alpha > 1e-4 ? vec4(color * alpha, alpha) : vec4(0.0);
}

// --- Main Logic ---
void main() {
    float radius = length(vLocalPos);
    float angle = atan(vLocalPos.y, vLocalPos.x);
    vec2 uv = vLocalPos;

    // === Only show ring in states 1 (forming) and 2 (pulsing) ===
    if (uState == 0) {
        fragColor = vec4(0.0);
        return;
    }

    // Procedural ring glow
    float noiseVal = simplexNoise(vec3(uv * NOISE_FREQUENCY, uTime * 0.5)) * 0.5 + 0.5;
    float ringRadius = mix(mix(INNER_RADIUS, 1.0, 0.4), mix(INNER_RADIUS, 1.0, 0.6), noiseVal);

    float distanceToRing = abs(radius - ringRadius);
    float ringGlow = linearAttenuation(1.0, 10.0, distanceToRing);
    ringGlow *= smoothstep(ringRadius * 1.05, ringRadius, radius);

    // Rotating hotspot
    float rot = -uTime;
    vec2 hotPos = vec2(cos(rot), sin(rot)) * ringRadius;
    float hotDist = distance(uv, hotPos);
    float tightFalloff = exp(-pow(hotDist * 6.0, 2.0)); // steeper Gaussian-like falloff
    float highlight = tightFalloff * linearAttenuation(1.0, 50.0, distanceToRing);

    // Soft edge and fade blending
    float outerFade = smoothstep(1.0, mix(INNER_RADIUS, 1.0, noiseVal * 0.5), radius);
    float innerHole = smoothstep(INNER_RADIUS, mix(INNER_RADIUS, 1.0, 0.90), radius);

    // Coloring
    float hueShift = cos(angle + uTime * 2.0) * 0.5 + 0.5;
    vec3 baseColor = mix(FIRE_BRIGHT, FIRE_MID, hueShift);
    vec3 color = mix(FIRE_DARK, baseColor, ringGlow);
    color = (color + highlight) * outerFade * innerHole;

    // === Unfurling sweep mask ===
    if (uState == 1) {
        float sweep = uFormProgress * 6.2831853 - 3.1415926; // [-π, π]
        float visibility = smoothstep(0.0, 0.05, sweep - angle);
        color *= visibility;
    }

    fragColor = premultiplyAlpha(clamp(color, 0.0, 1.0));
}
