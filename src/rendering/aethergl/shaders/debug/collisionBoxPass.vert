#version 300 es
precision mediump float;

// ─── Static Quad (unit square centered at origin) ───────────────────────────
// Two triangles forming a [-1,+1] quad.
in vec2 position;

// ─── Per-Instance Attributes ───────────────────────────────────────────────
layout(location = 1) in vec2 aCenter;       // World-space center of box
layout(location = 2) in vec2 aHalfSize;     // Half-width / half-height in pixels
layout(location = 3) in float aRotation;    // Rotation in radians

// ─── Uniforms ──────────────────────────────────────────────────────────────
layout(std140) uniform CameraBlock {
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
};

// ─── Varyings ──────────────────────────────────────────────────────────────
out vec2 vLocalUV;  // Local quad UV for fragment effects if needed

void main() {
    // Convert unit quad [-1,1] coords to box space
    vec2 local = position * aHalfSize;

    // Apply rotation
    float cosR = cos(aRotation);
    float sinR = sin(aRotation);
    vec2 rotated = vec2(
        local.x * cosR - local.y * sinR,
        local.x * sinR + local.y * cosR
    );

    // Final world position
    vec2 worldPos = aCenter + rotated;

    // Transform to clip space
    vec4 world = vec4(worldPos, 0.0, 1.0);
    vec4 view = uViewMatrix * world;
    gl_Position = uProjectionMatrix * view;

    // For potential fragment use (not strictly needed here)
    vLocalUV = (position + 1.0) * 0.5; // 0–1 range
}
