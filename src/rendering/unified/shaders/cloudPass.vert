#version 300 es

layout(location = 0) in vec2 a_position;

uniform vec2 u_worldOffset;  // world-space offset (scaled)
uniform float u_scale;       // global scale factor for UV domain (optional)

out vec2 v_uv;        // Standard 0–1 screen UV
out vec2 v_worldUV;   // Precomputed UV including world offset

void main() {
    // Base screen UV (0–1 range)
    v_uv = a_position * 0.5 + 0.5;

    // Precompute a shifted/scaled UV for cloud sampling
    v_worldUV = v_uv * u_scale + vec2(u_worldOffset.x, -u_worldOffset.y);

    gl_Position = vec4(a_position, 0.0, 1.0);
}
