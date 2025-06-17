#version 300 es
precision mediump float;

// Vertex attribute: quad corner position in local space (e.g., [-1,-1] to [1,1])
in vec2 a_position;

// Output to fragment shader
out vec2 vScreenPos;
flat out int vInstanceID; // Pass instance index explicitly

uniform vec2 uResolution;

// Per-light data buffer
// Each light occupies 3 vec4s:
//   vec4[0] = [x, y, radius, unused]
//   vec4[1] = [r, g, b, intensity]
//   vec4[2] = [falloff, _, _, _]
layout(std140) uniform LightBlock {
  vec4 uLightData[30000];
};

void main() {
  int idx = gl_InstanceID;

  vec2 lightPos = uLightData[idx * 3 + 0].xy;
  float radius  = uLightData[idx * 3 + 0].z;

  vec2 scaled   = a_position * radius;
  vec2 position = lightPos + scaled;

  vec2 clip = (position / uResolution) * 2.0 - 1.0;
  clip.y = -clip.y; // Flip Y for screen-space

  gl_Position = vec4(clip, 0.0, 1.0);
  vScreenPos = position;
  vInstanceID = idx;
}
