#version 300 es
precision mediump float;

layout(location = 0) in vec2 aPosition;
uniform vec2 uOffset;
uniform vec2 uScale;
out vec2 vUV;

void main() {
  vec2 pos = aPosition * uScale + uOffset;
  vUV = (aPosition + 1.0) / 2.0;
  gl_Position = vec4(pos, 0.0, 1.0);
}
