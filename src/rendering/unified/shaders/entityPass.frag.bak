#version 300 es
precision mediump float;

in vec2 vUV;
in vec2 vScreenUV;
out vec4 outColor;

uniform sampler2D uTexture;
uniform sampler2D uLightMap;

uniform float uTime;
uniform float uGlowStrength;
uniform float uEnergyPulse;
uniform vec3 uChargeColor;
uniform float uSheenStrength;
uniform vec3 uCollisionColor;
uniform bool uUseCollisionColor;
uniform vec3 uAmbientLight;
uniform vec3 uBlockColor;
uniform float uBlockColorIntensity;
uniform bool uUseBlockColor;

void main() {
  vec4 base = texture(uTexture, vUV);
  if (base.a < 0.01) discard;

  // === Lightmap Sampling ===
  vec3 lightSample = texture(uLightMap, vScreenUV).rgb;
  vec3 effectiveLight = max(lightSample, uAmbientLight);

  // === Lighting Layers ===
  vec3 ambiented = base.rgb * uAmbientLight;
  vec3 modulated = base.rgb * lightSample;
  vec3 additive = lightSample * 0.7;

  base.rgb = ambiented + modulated * 0.6 + additive * 0.4;

  // === Radial Charge Bloom ===
  vec2 centeredUV = vUV - 0.5;
  float dist = length(centeredUV);
  float wavePhase = uTime * 3.0 - dist * 8.0;
  float pulse = sin(wavePhase) * 0.5 + 0.5;
  pulse = pow(pulse, 2.0);

  float innerRadius = 0.1;
  float outerRadius = 0.4;
  float falloff = 1.0 - smoothstep(innerRadius, outerRadius, dist);
  falloff = pow(falloff, 1.5);

  float energy = pulse * falloff * uEnergyPulse;
  base.rgb += uChargeColor * energy * 0.8;

  // === Pulsating Glow ===
  float breathe = sin(uTime * 2.5) * 0.3 + 0.7;
  breathe = smoothstep(0.4, 1.0, breathe);
  base.rgb += base.rgb * uGlowStrength * breathe * 0.3;

  // === Metallic Sheen ===
  if (uSheenStrength > 0.0) {
    float radialFalloff = 1.0 - smoothstep(0.0, 0.7, dist);
    radialFalloff = pow(radialFalloff, 0.8);

    float noise = sin(vUV.x * 12.0) * sin(vUV.y * 8.0) * 0.1 + 0.9;
    float metallic = radialFalloff * noise;

    vec3 metallicColor = base.rgb * 1.2 + vec3(0.05, 0.05, 0.1);
    base.rgb = mix(base.rgb, metallicColor, uSheenStrength * metallic * 0.3);
    base.rgb += uSheenStrength * metallic * 0.15;
  }

  // === Block Color Override (applied last, pre-collision) ===
  if (uUseBlockColor) {
    base.rgb = mix(base.rgb, base.rgb * uBlockColor, uBlockColorIntensity);
  }

  // === Collision Debug Color Override ===
  if (uUseCollisionColor) {
    base.rgb = uCollisionColor;
  }

  outColor = base;
}
