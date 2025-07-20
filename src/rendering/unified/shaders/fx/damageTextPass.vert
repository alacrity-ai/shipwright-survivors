#version 300 es
precision mediump float;

layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 aWorldPos;
layout(location = 2) in float aScale;
layout(location = 3) in float aAlpha;
layout(location = 4) in vec3 aColor;
layout(location = 5) in float aPhase;
layout(location = 6) in float aGlyphIndex;
layout(location = 7) in float aNeonEnabled;
layout(location = 8) in float aDigitOffset;

layout(std140) uniform CameraMatrices {
  mat4 uProjectionMatrix;
  mat4 uViewMatrix;
};

uniform float u_cellWidth;
uniform float u_cellHeight;
uniform float u_spacingFactor;  // NEW
uniform float u_baseScale;      // NEW

out vec2 vUV;
out float vAlpha;
out vec3 vColor;
out float vPhase;
out float vNeonEnabled;

void main() {
  // Compute glyph atlas UVs (unchanged)
  float u0 = aGlyphIndex * u_cellWidth;
  float u1 = u0 + u_cellWidth;
  float uvx = mix(u0, u1, (aCorner.x * 0.5) + 0.5);
  float uvy = (aCorner.y * 0.5) + 0.5;

  vUV = vec2(uvx, uvy);
  vAlpha = aAlpha;
  vColor = aColor;
  vPhase = aPhase;
  vNeonEnabled = aNeonEnabled;

  // Dynamic horizontal spacing scaled by the glyph’s current scale
  float spacing = u_spacingFactor * u_baseScale * (aScale / u_baseScale);
  vec2 worldOffset = aCorner * aScale + vec2(aDigitOffset * spacing, 0.0);

  vec2 worldPos = aWorldPos + worldOffset;
  gl_Position = uProjectionMatrix * uViewMatrix * vec4(worldPos, 0.0, 1.0);
}
