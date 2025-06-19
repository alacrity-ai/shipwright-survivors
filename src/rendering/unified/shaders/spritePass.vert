#version 300 es
precision mediump float;

// === Attribute Bindings ===
// Quad vertex position (static)
layout(location = 0) in vec2 aPosition;

// Per-instance attributes
layout(location = 1) in vec2 aInstancePos;     // world-space center
layout(location = 2) in vec2 aInstanceSize;    // world-space size
layout(location = 3) in float aInstanceAlpha;  // transparency
layout(location = 4) in float aInstanceRotation; // rotation in radians

// === Uniform block for camera ===
layout(std140) uniform CameraMatrices {
  mat4 uProjectionMatrix;
  mat4 uViewMatrix;
};

out vec2 vUV;
out float vAlpha;

void main() {
  // Apply rotation to the quad vertex position
  float cosR = cos(aInstanceRotation);
  float sinR = sin(aInstanceRotation);
  
  // Rotate the position around the origin
  vec2 rotatedPos = vec2(
    aPosition.x * cosR - aPosition.y * sinR,
    aPosition.x * sinR + aPosition.y * cosR
  );
  
  // Scale and translate to world position
  vec2 scaled = rotatedPos * aInstanceSize;
  vec2 world = scaled + aInstancePos;

  gl_Position = uProjectionMatrix * uViewMatrix * vec4(world, 0.0, 1.0);

  // UVs range from (0,0) bottom-left to (1,1) top-right
  vUV = vec2((aPosition.x + 1.0) * 0.5, 1.0 - (aPosition.y + 1.0) * 0.5);
  vAlpha = aInstanceAlpha;
}
