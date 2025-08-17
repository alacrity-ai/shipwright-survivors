#version 300 es
precision mediump float;

in vec2 position;

layout(std140) uniform CameraBlock {
  mat4 uProjectionMatrix;
  mat4 uViewMatrix;
};

uniform mat4 uModelMatrix;
uniform vec2 uBlockPosition;
uniform float uBlockRotation;
uniform vec2 uBlockScale;
uniform vec2 uTileSize;

// New uniforms for atlas sampling
uniform vec2 uBaseUVOffset;     // Top-left corner of base sprite in atlas
uniform vec2 uOverlayUVOffset;  // Top-left corner of overlay sprite in atlas
uniform float uUseOverlay;      // 1.0 = overlay, 0.0 = base

out vec2 vUV;              // Local UV (0–1)
out vec2 vScreenUV;        // Post-projection screen UV
out vec2 vBaseUVOffset;    // Forwarded to frag for sampling
out vec2 vOverlayUVOffset; // "
out float vUseOverlay;     // "
void main() {
  // Local quad UV (from vertex pos)
  vUV = vec2(position.x * 0.5 + 0.5, 1.0 - (position.y * 0.5 + 0.5));

  // Local vertex → scaled
  vec2 scaledPosition = position * uBlockScale * 0.5;
  vec2 flippedPosition = vec2(scaledPosition.x, -scaledPosition.y);

  // Rotation
  float cos_rot = cos(uBlockRotation);
  float sin_rot = sin(uBlockRotation);
  vec2 rotatedPosition = vec2(
    flippedPosition.x * cos_rot - flippedPosition.y * sin_rot,
    flippedPosition.x * sin_rot + flippedPosition.y * cos_rot
  );

  vec2 blockWorldPosition = rotatedPosition + uBlockPosition;

  // Final transformation
  vec4 worldPos = uModelMatrix * vec4(blockWorldPosition, 0.0, 1.0);
  vec4 viewPos = uViewMatrix * worldPos;
  gl_Position = uProjectionMatrix * viewPos;

  // Screen UV (for lightmap sampling)
  vScreenUV = gl_Position.xy / gl_Position.w * 0.5 + 0.5;

  // Pass-through atlas metadata
  vBaseUVOffset = uBaseUVOffset;
  vOverlayUVOffset = uOverlayUVOffset;
  vUseOverlay = uUseOverlay;
}
