#version 300 es
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;

out vec4 fragColor;

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = (fragCoord.xy / iResolution.xy) - 0.5;
    uv.x *= iResolution.x / iResolution.y; // Correct aspect ratio

    // Enhanced spiral motion with depth
    float t = iTime * 0.08 + ((0.3 + 0.04 * sin(iTime * 0.1)) / (length(uv.xy) + 0.1)) * 1.8;
    float si = sin(t);
    float co = cos(t);
    mat2 ma = mat2(co, si, -si, co);

    float v1 = 0.0;
    float v2 = 0.0;
    float v3 = 0.0;

    float s = 0.0;
    // Moderate iterations to maintain spiral complexity
    for (int i = 0; i < 65; i++) {
        vec3 p = s * vec3(uv, 0.0);
        p.xy *= ma;
        p += vec3(0.22, 0.3, s - 1.5 - sin(iTime * 0.1) * 0.08);

        // Fractal iteration for spiral structure
        for (int j = 0; j < 7; j++) {
            p = abs(p) / dot(p, p) - 0.68;
        }

        v1 += dot(p, p) * 0.002;
        v2 += dot(p, p) * 0.0018;
        v3 += length(p.xy * 8.0) * 0.0004;
        s += 0.038;
    }

    float len = length(uv);

    // Preserve spiral structure with smooth falloff
    v1 *= smoothstep(0.75, 0.0, len);
    v2 *= smoothstep(0.6, 0.0, len);
    v3 *= smoothstep(0.85, 0.0, len);

    // Static, elegant color palette
    vec3 color1 = vec3(0.15, 0.05, 0.7);  // Deep blue-purple
    vec3 color2 = vec3(0.05, 0.5, 0.85);  // Cyan
    vec3 color3 = vec3(0.7, 0.2, 0.8);    // Magenta

    // Enhanced spiral color mixing
    vec3 col = color1 * v1 * 0.8 +
               color2 * v2 * 0.6 +
               color3 * v3 * 0.4 +
               color1 * v1 * v2 * 0.3;

    // Central glow with spiral influence
    col += smoothstep(0.25, 0.0, len) * vec3(0.1, 0.15, 0.35) * (0.4 + v3 * 0.2);

    // Refined tone mapping
    col = col / (1.0 + col * 0.8);
    col = pow(col, vec3(0.85));

    fragColor = vec4(col, 1.0);
}
