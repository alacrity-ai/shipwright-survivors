#version 300 es
precision mediump float;

in float vFadeAlpha;
in vec4  vColor;

out vec4 fragColor;

void main() {
  // Optional: hard edge feathering could be applied here
  // e.g., radial gradient or distance-from-center, if passing UV
  fragColor = vec4(vColor.rgb, vColor.a * vFadeAlpha);
}
