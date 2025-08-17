#version 300 es
precision highp float;

layout(location = 0) in vec2 aCorner; // Unit quad corners (-1..1)

layout(std140) uniform CameraMatrices {
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
};

uniform vec2 uArenaCenter;   // World-space position of the arena center
uniform float uArenaRadius;  // Arena radius in world units
uniform float uWallThickness; // Wall thickness (needed for proper quad sizing)

out vec2 vLocalPos; // Normalized local position (-1..1), for radial math in frag

void main() {
    // Calculate the outer radius including wall thickness
    float outerRadius = uArenaRadius + uWallThickness * 0.5;
    
    // Scale the quad to cover the full outer diameter with some padding
    float quadSize = outerRadius * 2.2; // 10% padding to ensure no clipping
    vec2 scaled = aCorner * quadSize;
    vec2 worldPos = scaled + uArenaCenter;

    // Pass normalized local space for angle/dist calculations
    // Scale vLocalPos to match the arena's actual size relative to the quad
    vLocalPos = aCorner * (quadSize / (uArenaRadius * 2.0));

    // Apply camera projection/view so the arena is placed in world space
    gl_Position = uProjectionMatrix * uViewMatrix * vec4(worldPos, 0.0, 1.0);
}