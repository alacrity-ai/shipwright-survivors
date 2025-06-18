#version 300 es
precision mediump float;

// === Attribute Bindings ===
// Quad vertex position (static)
layout(location = 0) in vec2 aPosition;

// Per-instance attributes
layout(location = 1) in vec2 aInstancePos;   // world-space center
layout(location = 2) in vec2 aInstanceSize;  // world-space size
layout(location = 3) in float aInstanceAlpha; // transparency

// === Uniform block for camera ===
layout(std140) uniform CameraMatrices {
  mat4 uProjectionMatrix;
  mat4 uViewMatrix;
};

out vec2 vUV;
out float vAlpha;

void main() {
  vec2 scaled = aPosition * aInstanceSize;
  vec2 world = scaled + aInstancePos;

  gl_Position = uProjectionMatrix * uViewMatrix * vec4(world, 0.0, 1.0);

  // UVs range from (0,0) bottom-left to (1,1) top-right
  vUV = vec2((aPosition.x + 1.0) * 0.5, 1.0 - (aPosition.y + 1.0) * 0.5);
  vAlpha = aInstanceAlpha;
}
