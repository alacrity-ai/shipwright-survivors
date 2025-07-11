#version 300 es
precision mediump float;

// ─── Static quad vertex (corner) ───
layout(location = 0) in vec2 aCorner;

// ─── Instance attributes ───
layout(location = 1) in vec2 aStart;      // World-space lightning segment start
layout(location = 2) in vec2 aEnd;        // World-space lightning segment end
layout(location = 3) in float aThickness; // World-space half-width
layout(location = 4) in float aAge;       // Normalized fade-out 0→1
layout(location = 5) in vec4 aColor;      // Premultiplied RGBA

// ─── UBO for projection/view ───
layout(std140) uniform CameraMatrices {
  mat4 uProjectionMatrix;
  mat4 uViewMatrix;
};

// ─── Interpolated to fragment ───
out float vFadeAlpha;
out vec4 vColor;

void main() {
  // Segment direction and normal
  vec2 dir = normalize(aEnd - aStart);
  vec2 normal = vec2(-dir.y, dir.x); // Perpendicular

  // Corner.x = -1 (start) or 1 (end)
  // Corner.y = -1 or 1 (side)
  float along = aCorner.x * 0.5 + 0.5; // remap from [-1,1] → [0,1]
  float side  = aCorner.y;

  vec2 base = mix(aStart, aEnd, along); // Lerp along the segment
  vec2 offset = normal * side * aThickness;

  vec2 worldPos = base + offset;

  gl_Position = uProjectionMatrix * uViewMatrix * vec4(worldPos, 0.0, 1.0);
  vFadeAlpha = 1.0 - aAge;
  vColor = aColor;
}
