// src/rendering/unified/shaders/shared.glsl

// Global cross-pass utilities

vec3 hexToRGB(uint hex) {
  return vec3(
    float((hex >> 16u) & 0xFFu) / 255.0,
    float((hex >> 8u) & 0xFFu) / 255.0,
    float(hex & 0xFFu) / 255.0
  );
}

float rand(vec2 uv) {
  return fract(sin(dot(uv.xy, vec2(12.9898,78.233))) * 43758.5453123);
}
