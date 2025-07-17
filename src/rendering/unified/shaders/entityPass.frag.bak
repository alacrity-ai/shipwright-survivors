#version 300 es
precision mediump float;

in vec2 vUV;
in vec2 vScreenUV;
in vec2 vBaseUVOffset;
in vec2 vOverlayUVOffset;
in float vUseOverlay;

out vec4 outColor;

uniform sampler2D uBlockAtlas;
uniform sampler2D uLightMap;

uniform float uTime;
uniform vec3 uCollisionColor;
uniform bool uUseCollisionColor;
uniform vec3 uAmbientLight;
uniform vec3 uBlockColor;
uniform float uBlockColorIntensity;
uniform bool uUseBlockColor;

// ─── New: Per-tile UV size in normalized atlas space ─────────────
uniform vec2 uTileSize;

void main() {
  // === Determine atlas sampling UV ===
  vec2 spriteUV = vUV;
  vec2 atlasUV = vUseOverlay > 0.5
    ? vOverlayUVOffset + spriteUV * uTileSize
    : vBaseUVOffset + spriteUV * uTileSize;

  vec4 base = texture(uBlockAtlas, atlasUV);
  if (base.a < 0.01) discard;

  // === Lightmap Sampling ===
  vec3 lightSample = texture(uLightMap, vScreenUV).rgb;

  // === Lighting Composition (PBR-style blending) ===
  vec3 ambientComponent = base.rgb * uAmbientLight;
  vec3 litComponent = base.rgb * lightSample;
  base.rgb = mix(ambientComponent, litComponent, 0.85);

  // === Block Color Override (modulates result color space) ===
  if (uUseBlockColor) {
    base.rgb = mix(base.rgb, base.rgb * uBlockColor, uBlockColorIntensity);
  }

  // === Collision Debug Color Override ===
  if (uUseCollisionColor) {
    base.rgb = uCollisionColor;
  }

  outColor = base;
}
