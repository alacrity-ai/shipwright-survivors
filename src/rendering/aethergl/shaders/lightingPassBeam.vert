#version 300 es
precision mediump float;

// src/rendering/unified/shaders/lightingPassBeam.vert

// Beam Vertex Shader - WebGL 2 version
in vec2 position;
out vec2 vPosition;

void main() {
  vPosition = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}