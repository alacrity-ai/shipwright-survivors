#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;

void main() {
  vec4 color = texture(uTexture, vUv);
  float avg = dot(color.rgb, vec3(0.333));
  fragColor = vec4(vec3(avg), color.a);
}
