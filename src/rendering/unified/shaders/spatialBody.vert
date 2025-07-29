#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;   // Quad [-1..1]
layout(location = 1) in vec2 aWorldPos;   // World-space center
layout(location = 2) in float aScale;     // Scale (world units)
layout(location = 3) in float aRotation;  // Rotation (radians)
layout(location = 4) in vec4 aUVRect;     // (uMin, vMin, uMax, vMax)

layout(std140) uniform CameraMatrices {
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
};

out vec2 vUV;

void main() {
    // Rotate the local quad
    float c = cos(aRotation);
    float s = sin(aRotation);
    vec2 rotated = vec2(
        aPosition.x * c - aPosition.y * s,
        aPosition.x * s + aPosition.y * c
    );

    // Scale and offset into world space
    vec2 worldPos = aWorldPos + rotated * aScale;

    // Transform world → clip space
    gl_Position = uProjectionMatrix * uViewMatrix * vec4(worldPos, 0.0, 1.0);

    // Compute UV from atlas rect
    vec2 uvLocal = (aPosition + 1.0) * 0.5;
    vUV = mix(aUVRect.xy, aUVRect.zw, uvLocal);
}
