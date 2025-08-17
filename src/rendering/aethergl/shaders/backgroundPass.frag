#version 300 es
precision mediump float;

in vec2 vUV;
uniform sampler2D uTexture;
uniform float uAlpha;
out vec4 fragColor;

void main() {
  vec4 texColor = texture(uTexture, vUV);
  fragColor = vec4(texColor.rgb, texColor.a * uAlpha);
}
