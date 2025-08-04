#version 300 es
precision mediump float;

layout(location = 0) in vec2 aCorner;     // Static quad [-1,1]
layout(location = 1) in vec2 aWorldPos;   // Center in world-space
layout(location = 2) in float aStartRadius;
layout(location = 3) in float aSize;
layout(location = 4) in float aStrength;

layout(std140) uniform CameraMatrices {
  mat4 uProjectionMatrix;
  mat4 uViewMatrix;
};

out vec2 vUV;             // Fullscreen UV [0,1]
out vec2 vCenterScreen;   // Projected center [0,1]
out float vStartRadius;
out float vSize;
out float vStrength;

void main() {
  // Render fullscreen quad in clip space (not world space!)
  gl_Position = vec4(aCorner, 0.0, 1.0);

  // Project shockwave center to screen space for fragment shader
  vec4 projectedCenter = uProjectionMatrix * uViewMatrix * vec4(aWorldPos, 0.0, 1.0);
  vCenterScreen = projectedCenter.xy / projectedCenter.w * 0.5 + 0.5;

  // Convert clip space corner to UV coordinates
  vUV = aCorner * 0.5 + 0.5;
  
  vStartRadius = aStartRadius;
  vSize = aSize;
  vStrength = aStrength;
}