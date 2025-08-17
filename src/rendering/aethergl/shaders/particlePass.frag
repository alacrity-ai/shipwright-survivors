#version 300 es
precision mediump float;

// src/rendering/unified/shaders/particlePass.frag

in float vAlpha;
in vec3 vColor;
out vec4 fragColor;

void main() {
  fragColor = vec4(vColor, vAlpha);
}
