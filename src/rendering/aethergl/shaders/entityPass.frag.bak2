#version 300 es
precision mediump float;

// ─── Inputs from Vertex Shader ───────────────────────────────────────────
in vec2 vUV;                // Local quad UV (0–1)
in vec2 vScreenUV;          // For lightmap sampling
in vec2 vBaseUVOffset;      // Top-left corner of base sprite in atlas
in vec2 vOverlayUVOffset;   // Top-left corner of overlay sprite in atlas
in float vUseOverlay;       // 1.0 = overlay, 0.0 = base
in vec3 vColor;             // Optional color tint
in float vUseColor;         // 1.0 if color override enabled

// ─── Outputs ─────────────────────────────────────────────────────────────
out vec4 outColor;

// ─── Uniforms ────────────────────────────────────────────────────────────
uniform sampler2D uBlockAtlas;
uniform sampler2D uLightMap;

uniform float uTime;
uniform vec3 uCollisionColor;
uniform bool uUseCollisionColor;
uniform vec3 uAmbientLight;

uniform vec2 uTileSize; // Atlas tile size (normalized)
uniform float uBlockColorIntensity;

void main() {
  // === Determine which tile to sample ===
  vec2 spriteUV = vUV;
  vec2 tileOffset = mix(vBaseUVOffset, vOverlayUVOffset, step(0.5, vUseOverlay));
  vec2 atlasUV = tileOffset + spriteUV * uTileSize;

  // === Sample base color from atlas ===
  vec4 base = texture(uBlockAtlas, atlasUV);
  if (base.a < 0.01) discard;

  // === Sample screen-space lighting ===
  vec3 lightSample = texture(uLightMap, vScreenUV).rgb;

  // === Lighting composition (ambient + directional blend) ===
  vec3 ambientComponent = base.rgb * uAmbientLight;
  vec3 litComponent = base.rgb * lightSample;
  base.rgb = mix(ambientComponent, litComponent, 0.85);

  // === Optional block color override (modulates color post-lighting) ===
  if (vUseColor > 0.5) {
    base.rgb = mix(base.rgb, base.rgb * vColor, uBlockColorIntensity);
  }

  // === Optional collision color override (debug visual) ===
  if (uUseCollisionColor) {
    base.rgb = uCollisionColor;
  }

  outColor = base;
}
