#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform float u_alpha;
uniform vec2 u_resolution;
uniform float u_speed;
uniform float u_density;
uniform vec2 u_worldOffset;   // world-space camera offset (scaled)
uniform vec3 u_color;         // RGB tint for clouds
uniform float u_quantity;     // Controls number/scale of cloud cells
uniform float u_scale;        // Global scale multiplier for parallax

// Hash and noise helpers
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise2d(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

float fbm2d(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise2d(p);
        amplitude *= 0.5;
        p *= 2.0;
    }
    return value;
}

// Cloud function (world-anchored FBM domain)
vec4 cloudLayer(vec2 uv, float speed, float layerScale, float density, float time, vec2 worldOffset) {
    // Apply global scale so "closer" layers move more relative to camera
    vec2 p = uv * layerScale * u_quantity + worldOffset * u_scale;

    p.x += time * speed;
    p.y += time * speed * 0.2;

    float cloud = fbm2d(p);
    cloud = smoothstep(0.35, 0.85, cloud * density);
    return vec4(u_color, cloud);
}

void main() {
    vec2 uv = v_uv;
    float time = u_time * u_speed;

    vec4 cloud1 = cloudLayer(uv, 0.015, 2.5, u_density * 0.8, time, u_worldOffset);
    vec4 cloud2 = cloudLayer(uv, 0.03, 4.0, u_density * 1.0, time, u_worldOffset);
    vec4 cloud3 = cloudLayer(uv, 0.05, 6.0, u_density * 1.2, time, u_worldOffset);

    vec3 color = vec3(0.0);
    color = mix(color, cloud1.rgb, cloud1.a * 0.5);
    color = mix(color, cloud2.rgb, cloud2.a * 0.6);
    color = mix(color, cloud3.rgb, cloud3.a * 0.7);

    float alpha = max(max(cloud1.a, cloud2.a), cloud3.a) * u_alpha;
    fragColor = vec4(color, alpha);
}
