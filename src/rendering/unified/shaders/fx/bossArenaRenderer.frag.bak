#version 300 es
precision highp float;

in vec2 vLocalPos;
out vec4 fragColor;

uniform float uTime;
uniform int uState;           // 0 = idle, 1 = forming, 2 = pulsing
uniform float uFormProgress;  // 0.0 to 1.0, used only for forming state

// Random & noise helpers
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    // vLocalPos is already normalized (-1..1), so treat arena radius as 1.0 here
    float dist = length(vLocalPos);
    float angle = atan(vLocalPos.y, vLocalPos.x);

    // Wall thickness relative to normalized arena
    float arenaRadius = 1.0;
    float wallThickness = 0.08; // Slightly thicker relative value for visibility
    float innerRadius = arenaRadius - wallThickness * 0.5;
    float outerRadius = arenaRadius + wallThickness * 0.5;

    vec3 color = vec3(0.0);
    float alpha = 0.0;

    if (uState == 1) {
        // === Forming ===
        float formAngle = uFormProgress * 2.0 * 3.14159 - 3.14159;
        bool shouldBeVisible = angle <= formAngle;

        if (shouldBeVisible && dist >= innerRadius && dist <= outerRadius) {
            float wallCenter = arenaRadius;
            float wallDist = abs(dist - wallCenter);
            float wallFactor = 1.0 - (wallDist / (wallThickness * 0.5));
            wallFactor = smoothstep(0.0, 1.0, wallFactor);

            float energyNoise = noise(vec2(angle * 8.0, uTime * 3.0)) * 0.3;
            float energyPulse = sin(uTime * 10.0 + angle * 5.0) * 0.2 + 0.8;

            float trailDist = abs(angle - formAngle);
            float trailFactor = exp(-trailDist * 15.0);

            // Cyan-blue energy tone
            color = vec3(0.2 + trailFactor * 0.8, 0.8 + energyNoise, 1.0);
            alpha = wallFactor * (energyPulse + trailFactor * 0.5);

            // Sparkles at the leading edge
            if (trailFactor > 0.1) {
                float sparkle = noise(vLocalPos * 100.0 + uTime * 5.0);
                if (sparkle > 0.7) {
                    color += vec3(1.0, 1.0, 0.5) * (sparkle - 0.7) * 3.0;
                }
            }
        }
    } else if (uState == 2) {
        // === Pulsing ===
        if (dist >= innerRadius && dist <= outerRadius) {
            float wallCenter = arenaRadius;
            float wallDist = abs(dist - wallCenter);
            float wallFactor = 1.0 - (wallDist / (wallThickness * 0.5));
            wallFactor = smoothstep(0.0, 1.0, wallFactor);

            float pulse1 = sin(uTime * 4.0) * 0.5 + 0.5;
            float pulse2 = sin(uTime * 6.0 + angle * 3.0) * 0.3 + 0.7;
            float pulse3 = sin(uTime * 8.0 - dist * 20.0) * 0.2 + 0.8;

            float energyNoise1 = noise(vec2(angle * 6.0, uTime * 2.0)) * 0.4;
            float energyNoise2 = noise(vec2(dist * 30.0, uTime * 3.0 + angle * 4.0)) * 0.3;

            float streamAngle = uTime * 1.5;
            float streamPattern = sin(angle * 8.0 - streamAngle) * 0.5 + 0.5;
            streamPattern = pow(streamPattern, 3.0) * 0.4;

            vec3 baseColor = vec3(0.3, 0.6, 1.0);
            vec3 pulseColor = vec3(0.8, 0.4, 1.0);
            vec3 streamColor = vec3(1.0, 0.8, 0.3);

            color = mix(baseColor, pulseColor, pulse1);
            color = mix(color, streamColor, streamPattern);
            color += vec3(energyNoise1, energyNoise2, energyNoise1 + energyNoise2) * 0.5;

            alpha = wallFactor * (pulse2 * pulse3 + streamPattern * 0.5);

            float flash = sin(uTime * 12.0 + angle * 7.0);
            if (flash > 0.9) {
                color += vec3(1.0) * (flash - 0.9) * 10.0;
            }
        }
    }

    fragColor = vec4(color, alpha);
}
