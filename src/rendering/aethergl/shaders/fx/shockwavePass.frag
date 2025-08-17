#version 300 es
precision highp float;

in vec2 vUV;
in vec2 vCenterScreen;
in float vStartRadius;
in float vSize;
in float vStrength;

uniform sampler2D uSceneTexture;

out vec4 fragColor;

const float PI = 3.14159265359;

vec2 applyShockwave(vec2 uv, vec2 center, float startRadius, float size, float strength) {
  vec2 dir = uv - center;
  float dist = length(dir);

  if (dist > startRadius && dist < (startRadius + size)) {
    float normalizedDist = (dist - startRadius) / size;
    float displacement = sin(normalizedDist * PI) * strength;
    return uv + normalize(dir) * displacement;
  }

  return uv;
}

void main() {
  vec2 displacedUV = applyShockwave(vUV, vCenterScreen, vStartRadius, vSize, vStrength);
  fragColor = texture(uSceneTexture, displacedUV);
}
