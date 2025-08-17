#version 300 es
precision mediump float;

// src/rendering/unified/shaders/lightingPass.vert

// Point Light Vertex Shader - WebGL 2 version
in vec2 a_position;

// Screen resolution in pixels
uniform vec2 uResolution;

// Light center in screen space
uniform vec2 uLightPosition;

// Light radius in pixels
uniform float uRadius;

// Pass to fragment shader
out vec2 vScreenPos;

void main() {
  // Scale quad to light radius, then translate to screen position
  vec2 scaled = a_position * uRadius;
  vec2 position = uLightPosition + scaled;

  // Convert to clip space [-1, 1]
  vec2 clip = (position / uResolution) * 2.0 - 1.0;
  clip.y = -clip.y; // flip Y for canvas-style orientation

  gl_Position = vec4(clip, 0, 1);
  vScreenPos = position;
}