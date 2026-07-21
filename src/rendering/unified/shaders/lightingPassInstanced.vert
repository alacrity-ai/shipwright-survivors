#version 300 es
precision mediump float;

// Vertex attribute: quad corner position in local space (e.g., [-1,-1] to [1,1])
layout(location = 0) in vec2 a_position;

// Per-instance light data (vertexAttribDivisor = 1):
//   a_posRadius       = [x, y, radius, unused]
//   a_colorIntensity  = [r, g, b, intensity]
//   a_falloff         = falloff/phase
layout(location = 1) in vec4 a_posRadius;
layout(location = 2) in vec4 a_colorIntensity;
layout(location = 3) in float a_falloff;

// Output to fragment shader
out vec2 vScreenPos;
flat out vec4 vPosRadius;
flat out vec4 vColorIntensity;
flat out float vFalloff;

uniform vec2 uResolution;

void main() {
  vec2 lightPos = a_posRadius.xy;
  float radius  = a_posRadius.z;

  vec2 scaled   = a_position * radius;
  vec2 position = lightPos + scaled;

  vec2 clip = (position / uResolution) * 2.0 - 1.0;
  clip.y = -clip.y; // Flip Y for screen-space

  gl_Position = vec4(clip, 0.0, 1.0);
  vScreenPos = position;
  vPosRadius = a_posRadius;
  vColorIntensity = a_colorIntensity;
  vFalloff = a_falloff;
}
