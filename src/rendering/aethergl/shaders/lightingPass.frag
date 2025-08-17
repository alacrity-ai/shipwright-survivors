#version 300 es
precision mediump float;

uniform vec2 uLightPosition;
uniform float uRadius;
uniform vec4 uColor;
uniform float uIntensity;
uniform float uFalloff;

in vec2 vScreenPos;
out vec4 fragColor;

void main() {
  float dist = distance(vScreenPos, uLightPosition);
  float normDist = clamp(dist / uRadius, 0.0, 1.0);

  // Radial falloff — soft and quadratic
  float falloff = pow(1.0 - normDist, 2.0);
  falloff *= uFalloff;

  // Discard pixels that contribute no visible light
  if (falloff < 0.001) {
    discard;
  }

  vec3 color = uColor.rgb * falloff * uIntensity;
  fragColor = vec4(color, 0.0); // Fully opaque; alpha ignored in additive blend
}
