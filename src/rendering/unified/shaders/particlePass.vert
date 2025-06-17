#version 300 es
precision mediump float;

// src/rendering/unified/shaders/particlePass.vert

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aParticlePos;
layout(location = 2) in float aSize;
layout(location = 3) in float aLifeRatio;
layout(location = 4) in vec3 aColor;

uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;

out float vAlpha;
out vec3 vColor;

void main() {
  vec2 scaled = aPosition * aSize;
  vec2 world = scaled + aParticlePos;
  gl_Position = uProjectionMatrix * uViewMatrix * vec4(world, 0.0, 1.0);
  vAlpha = aLifeRatio;
  vColor = aColor;
}
