#version 300 es
precision mediump float;

in vec2 vScreenPos;
flat in vec4 vPosRadius;      // [x, y, radius, unused]
flat in vec4 vColorIntensity; // [r, g, b, intensity]
flat in float vFalloff;
out vec4 fragColor;

void main() {
  vec2  lightPos     = vPosRadius.xy;
  float radius       = vPosRadius.z;

  vec3  color        = vColorIntensity.rgb;
  float intensity    = vColorIntensity.a;

  float dist     = distance(vScreenPos, lightPos);
  float normDist = clamp(dist / radius, 0.0, 1.0);
  float falloff  = pow(1.0 - normDist, 2.0) * vFalloff;

  if (falloff < 0.001) discard;

  fragColor = vec4(color * falloff * intensity, 0.0); // Alpha unused in additive blend
}
