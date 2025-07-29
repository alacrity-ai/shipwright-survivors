#version 300 es
precision mediump float;

in vec2 vUV;

uniform sampler2D uAtlas;  // Texture atlas (bound to unit 0)
uniform float uAlpha;      // Global alpha (matches PlanetPass style)

out vec4 fragColor;

void main() {
  vec4 texColor = texture(uAtlas, vUV);
  fragColor = vec4(texColor.rgb, texColor.a * uAlpha);
}
