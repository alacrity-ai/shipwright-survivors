#version 300 es
precision mediump float;

in vec2 vUV;
uniform sampler2D uTexture;
uniform float uMaxBrightness;

out vec4 fragColor;

void main() {
  vec4 color = texture(uTexture, vUV);

  // Skip blending in pixels with no light contribution
  if (max(color.r, max(color.g, color.b)) < 0.001) {
    discard;
  }

  // Brightness capping (ITU-R BT.709 luminance weighting)
  float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  if (brightness > uMaxBrightness) {
    color.rgb *= uMaxBrightness / brightness;
  }

  fragColor = color;
}
