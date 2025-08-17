#version 300 es
precision mediump float;

in vec2 vScreenPos;
flat in int vInstanceID;
out vec4 fragColor;

// Per-light data buffer
// Each light occupies 3 vec4s:
//   vec4[0] = [x, y, radius, unused]
//   vec4[1] = [r, g, b, intensity]
//   vec4[2] = [falloff, _, _, _]
layout(std140) uniform LightBlock {
  vec4 uLightData[30000]; // 5000 lights * 3 vec4s
};

void main() {
  int idx = vInstanceID;

  vec2  lightPos     = uLightData[idx * 3 + 0].xy;
  float radius       = uLightData[idx * 3 + 0].z;

  vec3  color        = uLightData[idx * 3 + 1].rgb;
  float intensity    = uLightData[idx * 3 + 1].a;

  float falloffParam = uLightData[idx * 3 + 2].x;

  float dist     = distance(vScreenPos, lightPos);
  float normDist = clamp(dist / radius, 0.0, 1.0);
  float falloff  = pow(1.0 - normDist, 2.0) * falloffParam;

  if (falloff < 0.001) discard;

  fragColor = vec4(color * falloff * intensity, 0.0); // Alpha unused in additive blend
}
