#version 300 es
precision mediump float;

in vec2 vUV;
in float vAlpha;

uniform sampler2D uTexture;

out vec4 fragColor;

void main() {
  vec4 texColor = texture(uTexture, vUV);
  fragColor = vec4(texColor.rgb, texColor.a * vAlpha);
}
