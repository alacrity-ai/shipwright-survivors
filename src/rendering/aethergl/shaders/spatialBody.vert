#version 300 es
precision highp float;

layout(location = 0) in vec2  aPosition;   // Quad [-1..1]
layout(location = 1) in vec2  aWorldPos;   // World-space center
layout(location = 2) in float aScale;      // Scale (world units)
layout(location = 3) in float aRotation;   // Rotation (radians)
layout(location = 4) in vec4  aUVRect;     // (uMin, vMin, uMax, vMax)
layout(location = 5) in float aEffects;    // Effect bitmask as float

layout(std140) uniform CameraMatrices {
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
};

out vec2 vUV;          // UV into the atlas
out vec2 vScreenUV;    // Screen-space UV for sampling the light buffer
out vec2 vCardUV;      // Quad-local UV in [0..1] (for rim/Fresnel proxies)
flat out int vEffects; // Effect bitmask (integer)

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
    vec4 clipPos = uProjectionMatrix * uViewMatrix * vec4(worldPos, 0.0, 1.0);
    gl_Position = clipPos;

    // Derive screen-space UV (normalized 0–1) for the light map
    vScreenUV = clipPos.xy / clipPos.w * 0.5 + 0.5;

    // Quad-local UV and atlas sampling UV
    vec2 uvLocal = (aPosition + 1.0) * 0.5; // [-1..1] → [0..1]
    vCardUV = uvLocal;
    vUV = mix(aUVRect.xy, aUVRect.zw, uvLocal);

    // Forward effects bitmask to fragment stage
    vEffects = int(aEffects + 0.5);
}
