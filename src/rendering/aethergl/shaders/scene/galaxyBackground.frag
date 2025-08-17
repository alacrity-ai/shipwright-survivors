#version 300 es
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

out vec4 fragColor;

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = (fragCoord.xy / iResolution.xy) - 0.5;
    uv.x *= iResolution.x / iResolution.y; // Correct aspect ratio

    float t = iTime * 0.08 + ((0.3 + 0.04 * sin(iTime * 0.1)) / (length(uv.xy) + 0.1)) * 1.8;
    float si = sin(t);
    float co = cos(t);
    mat2 ma = mat2(co, si, -si, co);

    float v1 = 0.0;
    float v2 = 0.0;
    float v3 = 0.0;

    float s = 0.0;
    for (int i = 0; i < 65; i++) {
        vec3 p = s * vec3(uv, 0.0);
        p.xy *= ma;
        p += vec3(0.22, 0.3, s - 1.5 - sin(iTime * 0.1) * 0.08);

        for (int j = 0; j < 7; j++) {
            p = abs(p) / dot(p, p) - 0.68;
        }

        v1 += dot(p, p) * 0.002;
        v2 += dot(p, p) * 0.0018;
        v3 += length(p.xy * 8.0) * 0.0004;
        s += 0.038;
    }

    float len = length(uv);

    v1 *= smoothstep(0.75, 0.0, len);
    v2 *= smoothstep(0.6, 0.0, len);
    v3 *= smoothstep(0.85, 0.0, len);

    vec3 col = uColor1 * v1 * 0.8 +
               uColor2 * v2 * 0.6 +
               uColor3 * v3 * 0.4 +
               uColor1 * v1 * v2 * 0.3;

    col += smoothstep(0.25, 0.0, len) * vec3(0.1, 0.15, 0.35) * (0.4 + v3 * 0.2);

    col = col / (1.0 + col * 0.8);
    col = pow(col, vec3(0.85));

    fragColor = vec4(col, 1.0);
}
