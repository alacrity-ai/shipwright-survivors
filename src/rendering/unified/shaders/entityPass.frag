#version 300 es
precision mediump float;

// ─── Inputs from Vertex Shader ───────────────────────────────────────────
in vec2 vUV;
in vec2 vScreenUV;
in vec2 vBaseUVOffset;
in vec2 vOverlayUVOffset;
in float vUseOverlay;
in vec3 vColor;
in float vUseColor;

// ─── Outputs ─────────────────────────────────────────────────────────────
out vec4 outColor;

// ─── Uniforms ────────────────────────────────────────────────────────────
uniform sampler2D uBlockAtlas;
uniform sampler2D uLightMap;

uniform float uTime;
uniform vec3  uCollisionColor;
uniform bool  uUseCollisionColor;
uniform vec3  uAmbientLight;

uniform vec2  uTileSize; // normalized per-tile size in atlas
uniform float uBlockColorIntensity;

// ─── Helpers ─────────────────────────────────────────────────────────────
float saturate(float x) { return clamp(x, 0.0, 1.0); }
vec3  saturate(vec3  v) { return clamp(v, 0.0, 1.0); }

// Cheap luma for height derivation / energy scaling
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// Smith GGX geometric term (fast approximation)
float smithGGX(float NdotV, float NdotL, float a) {
  float a2 = a * a;
  float gv = NdotV + sqrt(a2 + (1.0 - a2) * NdotV * NdotV);
  float gl = NdotL + sqrt(a2 + (1.0 - a2) * NdotL * NdotL);
  return 1.0 / (gv * gl);
}

// Schlick Fresnel
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  float oneMinus = 1.0 - cosTheta;
  float oneMinus5 = oneMinus*oneMinus*oneMinus*oneMinus*oneMinus;
  return F0 + (1.0 - F0) * oneMinus5;
}

// Derive a pseudo-normal from atlas luminance (height from albedo)
vec3 heightNormal(vec2 uv, vec2 texel) {
  // Small Sobel-ish taps in atlas space
  float hC = luma(texture(uBlockAtlas, uv).rgb);
  float hR = luma(texture(uBlockAtlas, uv + vec2(texel.x, 0.0)).rgb);
  float hL = luma(texture(uBlockAtlas, uv - vec2(texel.x, 0.0)).rgb);
  float hT = luma(texture(uBlockAtlas, uv + vec2(0.0, texel.y)).rgb);
  float hB = luma(texture(uBlockAtlas, uv - vec2(0.0, texel.y)).rgb);
  vec2 g = vec2(hR - hL, hT - hB);

  // Scale controls apparent “bevel” depth; keep conservative for stability
  const float depth = 1.8;
  vec3 n = normalize(vec3(-g * depth, 1.0));
  return n;
}

void main() {
  // === Tile selection ===
  vec2 spriteUV  = vUV;
  vec2 tileOffset = mix(vBaseUVOffset, vOverlayUVOffset, step(0.5, vUseOverlay));
  vec2 atlasUV   = tileOffset + spriteUV * uTileSize;

  // === Base sample ===
  vec4 base = texture(uBlockAtlas, atlasUV);
  if (base.a < 0.01) discard;

  // === Lighting inputs ===
  vec3 envL = texture(uLightMap, vScreenUV).rgb;  // used for both diffuse & faux reflections

  // === Derive a stable normal from the atlas itself ===
  // One texel in atlas space for finite differences
  vec2 texel = uTileSize / vec2(textureSize(uBlockAtlas, 0));
  vec3 N = heightNormal(atlasUV, texel);

  // View and light directions (screen-facing V; a plausible sun L)
  const vec3 V = vec3(0.0, 0.0, 1.0);
  const vec3 L = normalize(vec3(0.45, 0.55, 0.70));
  const vec3 H = normalize(L + V);

  float NdotL = saturate(dot(N, L));
  float NdotV = saturate(dot(N, V));
  float NdotH = saturate(dot(N, H));
  float VdotH = saturate(dot(V, H));

  // === Metallic shading parameters (no new uniforms) ===
  // Treat everything as metal with albedo-tinted F0; roughness from brightness.
  float brightness = luma(base.rgb);
  float rough = clamp(0.10 + 0.20 * (1.0 - brightness), 0.06, 0.32); // darker → smoother metal
  float a = max(rough*rough, 1e-4);

  vec3  F0 = mix(vec3(0.04), base.rgb, 0.92);     // “very metallic”
  vec3  F  = fresnelSchlick(NdotV, F0);

  // GGX distribution (Trowbridge-Reitz)
  float a2 = a * a;
  float denom = max((NdotH*NdotH) * (a2 - 1.0) + 1.0, 1e-4);
  float D = a2 / (3.14159265 * denom * denom);

  // Geometry term
  float G = smithGGX(NdotV, NdotL, a);

  // Specular BRDF
  vec3 spec = (D * G) * F * max(NdotL, 0.0);

  // === Fake screen-space reflection using the light map ===
  // Reflect view around N and parallax-offset inside lightmap for dynamic “chrome”.
  vec3 R = reflect(-V, N);
  // Map [-1,1] → small UV offset; scale with roughness for blurrier reflections on rougher surfaces.
  float reflScale = mix(0.04, 0.012, rough); // smoother → larger sweep
  vec2  rUv = vScreenUV + R.xy * reflScale;

  // Two-tap blur for stability (cheap)
  vec3 envRef1 = texture(uLightMap, clamp(rUv, 0.0, 1.0)).rgb;
  vec3 envRef2 = texture(uLightMap, clamp(rUv + vec2(0.002, -0.002), 0.0, 1.0)).rgb;
  vec3 envRef  = 0.5 * (envRef1 + envRef2);

  // Fresnel-drive the reflection weight; keep some baseline metallic reflectance
  float fres = saturate(0.08 + 0.92 * pow(1.0 - NdotV, 5.0));
  vec3  reflection = envRef * (F0 * (0.35 + 0.65 * fres));

  // === Diffuse (highly suppressed for metals) ===
  // Retain a whisper of diffuse so painted metals still show hue under low light.
  vec3 diffuse = base.rgb
              * mix(uAmbientLight * 1.35, envL, 0.75)
              * (0.12 + 0.32 * (1.0 - rough))
              * NdotL;


  // === Clearcoat lobe (tight, colorless highlight) ===
  float coatRough = max(rough * 0.35, 0.02);
  float coatA = coatRough * coatRough;
  float coatDen = max((NdotH*NdotH)*(coatA*coatA - 1.0) + 1.0, 1e-4);
  float coatD = (coatA*coatA) / (3.14159265 * coatDen * coatDen);
  float coatG = smithGGX(NdotV, NdotL, coatA);
  float coat = coatD * coatG * saturate(dot(N, L));
  // Energy-conserving mix so we don’t blow out
  vec3 specular = spec + vec3(0.5) * coat;

  // === Compose ===
  vec3 lit = diffuse + specular + reflection;

  // Optional block color tint (post-lighting modulation, as in your original)
  if (vUseColor > 0.5) {
    lit = mix(lit, lit * vColor, uBlockColorIntensity);
  }

  // Optional collision override (debug)
  if (uUseCollisionColor) {
    lit = uCollisionColor;
  }

  outColor = vec4(saturate(lit), base.a);
}
