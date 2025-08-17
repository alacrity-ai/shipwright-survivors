#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;

layout(location = 1) in vec2 aWorldPos;
layout(location = 2) in float aRadius;
layout(location = 3) in float aTime;
layout(location = 4) in float aStrength;
layout(location = 5) in float aType;

layout(std140) uniform CameraMatrices {
  mat4 uProjectionMatrix;
  mat4 uViewMatrix;
};

uniform vec2 uResolution;

out vec2 vScreenCenter;
out float vRadius;
out float vTime;
out float vStrength;
out float vType;

void main() {
  vec2 scaled = aPosition * aRadius;
  vec2 world = scaled + aWorldPos;

  gl_Position = uProjectionMatrix * uViewMatrix * vec4(world, 0.0, 1.0);

  // Compute screen-space center of the instance
  vec4 clipCenter = uProjectionMatrix * uViewMatrix * vec4(aWorldPos, 0.0, 1.0);
  vScreenCenter = (clipCenter.xy / clipCenter.w * 0.5 + 0.5) * uResolution;

  vRadius = aRadius;
  vTime = aTime;
  vStrength = aStrength;
  vType = aType;
}
