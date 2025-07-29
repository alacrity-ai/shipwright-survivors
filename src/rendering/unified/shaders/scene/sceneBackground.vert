#version 300 es
precision mediump float;

layout(location = 0) in vec2 aPosition;
out vec2 vUV;

void main() {
  // Flip Y to account for WebGL's texture coordinate system
  vUV = vec2((aPosition.x + 1.0) * 0.5,
             1.0 - (aPosition.y + 1.0) * 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
