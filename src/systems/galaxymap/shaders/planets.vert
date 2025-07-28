#version 300 es
precision highp float;

layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec3 instanceOffset;
layout(location = 3) in float instanceScale;
layout(location = 4) in vec3 instanceColor;
layout(location = 5) in float instanceAlpha;
layout(location = 6) in float instanceRotationSpeed;
layout(location = 7) in vec2 uv; // NEW: per-vertex texture coordinates

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float time;

out vec3 vNormal;
out vec3 vWorldPosition;
out vec3 vColor;
out float vAlpha;
out vec2 vUV; // Pass to fragment shader

void main() {
    // Compute rotation angle for this instance
    float rotation = time * instanceRotationSpeed;

    // Rotation around Y (right-handed)
    mat4 rotationY = mat4(
        cos(rotation), 0.0, sin(rotation), 0.0,
        0.0,           1.0, 0.0,           0.0,
       -sin(rotation), 0.0, cos(rotation), 0.0,
        0.0,           0.0, 0.0,           1.0
    );

    // Uniform scale
    mat4 scaleM = mat4(
        instanceScale, 0.0, 0.0, 0.0,
        0.0, instanceScale, 0.0, 0.0,
        0.0, 0.0, instanceScale, 0.0,
        0.0, 0.0, 0.0, 1.0
    );

    // Translation
    mat4 translation = mat4(
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        instanceOffset.x, instanceOffset.y, instanceOffset.z, 1.0
    );

    // Combine transforms (column-major order)
    mat4 modelMatrix = translation * rotationY * scaleM;

    // Transform vertex into world space
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    // Transform normals (uniform scale → no inverse transpose needed)
    mat3 normalMatrix = mat3(modelMatrix);
    vNormal = normalize(normalMatrix * normal);

    // Pass through attributes
    vUV = uv;
    vColor = instanceColor;
    vAlpha = instanceAlpha;

    // Final position
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
