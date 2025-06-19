#version 300 es
// src/rendering/unified/shaders/postprocess/passthrough.frag
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;

void main() {
  fragColor = texture(uTexture, vUv);
}
