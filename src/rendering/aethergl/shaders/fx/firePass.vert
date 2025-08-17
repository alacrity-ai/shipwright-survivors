#version 300 es
precision mediump float;

// ─── Static quad corners (unit square in NDC, scaled per-instance) ───
layout(location = 0) in vec2 aCorner;

// ─── Instance attributes (SOA packed in FirePass) ───
layout(location = 1) in vec2 aWorldPos;   // Fire blob center in world space
layout(location = 2) in float aRadius;    // Quad scale (world units)
layout(location = 3) in float aAge;       // Normalized 0 → 1, for fade or growth
layout(location = 4) in float aIntensity; // Scalar for alpha flicker
layout(location = 5) in float aRampIndex; // Selects gradient ramp

// ─── UBO for camera projection/view ───
layout(std140) uniform CameraMatrices {
  mat4 uProjectionMatrix;
  mat4 uViewMatrix;
};

// ─── Outputs to fragment shader ───
out vec2 vLocalUV;       // Quad-local UV (-1 to 1 range)
out float vAge;          // Pass age for fading
out float vIntensity;    // Alpha/intensity modulation
out float vRampIndex;    // Pass ramp index (0–N for texture atlas)

void main() {
  // Transform the static quad corner into world space
  vec2 worldOffset = aCorner * aRadius;
  vec2 worldPos = aWorldPos + worldOffset;

  gl_Position = uProjectionMatrix * uViewMatrix * vec4(worldPos, 0.0, 1.0);

  vLocalUV = aCorner;
  vAge = aAge;
  vIntensity = aIntensity;
  vRampIndex = aRampIndex;
}
