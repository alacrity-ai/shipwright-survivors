// src/rendering/unified/shaders/common.glsl

// Scoped reused subset logic

struct Light {
  vec2 position;
  float radius;
  vec3 color;
  float intensity;
};

uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
