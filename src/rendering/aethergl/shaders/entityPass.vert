#version 300 es
precision mediump float;

// ─── Static Vertex Quad ───────────────────────────────────────────────────
in vec2 position; // [-1, +1] quad corners

// ─── Per-Instance Attributes ──────────────────────────────────────────────
layout(location = 1) in vec2 aPos;              // World position of block
layout(location = 2) in float aRotation;        // Block rotation (radians)
layout(location = 3) in vec2 aBaseUV;           // Base UV top-left
layout(location = 4) in vec2 aOverlayUV;        // Overlay UV top-left
layout(location = 5) in float aUseOverlay;      // 1.0 = overlay, 0.0 = base
layout(location = 6) in vec3 aColor;            // RGB color override
layout(location = 7) in float aUseColor;        // Whether to apply color override

// ─── Uniforms ─────────────────────────────────────────────────────────────
layout(std140) uniform CameraBlock {
  mat4 uProjectionMatrix;
  mat4 uViewMatrix;
};

uniform vec2 uBlockScale;  // BLOCK_SIZE x BLOCK_SIZE
uniform vec2 uTileSize;    // One tile size in UV space (in atlas)

// ─── Varyings to Fragment Shader ──────────────────────────────────────────
out vec2 vUV;              // Local quad UV (0–1)
out vec2 vScreenUV;        // For lightmap
out vec2 vBaseUVOffset;    // Top-left UV of base tile
out vec2 vOverlayUVOffset; // Top-left UV of overlay tile
out float vUseOverlay;     // Passed along for conditionals
out vec3 vColor;           // Block color
out float vUseColor;

void main() {
  // Local quad UV (for sampling)
  vUV = vec2(position.x * 0.5 + 0.5, 1.0 - (position.y * 0.5 + 0.5));

  // Scale and flip local quad
  vec2 scaled = position * uBlockScale * 0.5;
  vec2 flipped = vec2(scaled.x, -scaled.y); // Y-flip due to texture coords

  // Apply block rotation
  float cosR = cos(aRotation);
  float sinR = sin(aRotation);
  vec2 rotated = vec2(
    flipped.x * cosR - flipped.y * sinR,
    flipped.x * sinR + flipped.y * cosR
  );

  // Final world position
  vec2 worldPos = aPos + rotated;

  // MVP transform
  vec4 world = vec4(worldPos, 0.0, 1.0);
  vec4 view = uViewMatrix * world;
  gl_Position = uProjectionMatrix * view;

  // Lightmap sampling
  vScreenUV = gl_Position.xy / gl_Position.w * 0.5 + 0.5;

  // Pass per-instance metadata
  vBaseUVOffset = aBaseUV;
  vOverlayUVOffset = aOverlayUV;
  vUseOverlay = aUseOverlay;
  vColor = aColor;
  vUseColor = aUseColor;
}
