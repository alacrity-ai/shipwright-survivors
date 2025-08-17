#version 300 es
precision highp float;

// ─── Inputs from vertex shader ───
in vec2 vLocalUV;       // Quad-local position (-1 to 1)
in float vAge;          // 0 (new) → 1 (end of life)
in float vIntensity;    // Scalar for alpha modulation
in float vRampIndex;    // For selecting gradient ramp

// ─── Outputs ───
out vec4 fragColor;

// ─── Uniforms ───
uniform float uTime;
uniform sampler2D uColorRamp;  // Gradient atlas (all ramps stacked vertically)
uniform float uRampCount;      // Number of vertical ramps in the atlas

// ─── Fire effect helpers ───

// Simple hash-based noise (lightweight, fast)
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 2D value noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  // Radial alpha falloff (fade edges of the quad)
  float dist = length(vLocalUV);
  float baseAlpha = smoothstep(1.0, 0.0, dist);

  // Vertical turbulence animation
  vec2 uvNoise = vLocalUV * 2.0 + vec2(0.0, uTime * 0.5);
  float turbulence = noise(uvNoise) * 0.5;

  // Combine turbulence with radial factor
  float flame = clamp((1.0 - dist) + turbulence, 0.0, 1.0);

  // Sample from gradient ramp atlas
  float rampCount = max(uRampCount, 1.0); // prevent div by zero
  float vStep = 1.0 / rampCount;
  float vOffset = clamp(vRampIndex, 0.0, rampCount - 1.0) * vStep;

  vec2 sampleUV = vec2(flame, vOffset + vStep * 0.5);
  vec4 color = texture(uColorRamp, sampleUV);

  // Flicker (low-frequency sine modulation)
  float flicker = 0.8 + 0.2 * sin(uTime * 30.0 + dist * 12.0);

  // Fade out by age
  float ageFade = 1.0 - vAge;

  fragColor = vec4(color.rgb, baseAlpha * flicker * ageFade * vIntensity);
}
