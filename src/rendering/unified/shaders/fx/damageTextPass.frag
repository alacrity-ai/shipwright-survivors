#version 300 es
precision highp float;

in vec2 vUV;
in float vAlpha;
in vec3 vColor;
in float vPhase;
in float vNeonEnabled;

out vec4 fragColor;

uniform sampler2D uDigitAtlas;
uniform float uNeonFreq;
uniform float uNeonAmp;

const vec3 NEON_COLORS[7] = vec3[7](
    vec3(1.0, 0.0, 1.0), // magenta
    vec3(0.0, 1.0, 1.0), // cyan
    vec3(1.0, 1.0, 0.0), // yellow
    vec3(0.0, 1.0, 0.0), // green
    vec3(1.0, 0.0, 0.0), // red
    vec3(0.0, 0.8, 1.0), // sky blue
    vec3(1.0, 0.5, 0.0)  // orange
);

void main() {
  vec4 glyph = texture(uDigitAtlas, vUV);
  if (glyph.a < 0.01) {
    discard;
  }

  float alpha = glyph.a * vAlpha;

  vec3 finalColor = vColor;

  if (vNeonEnabled > 0.5) {
    // Slower cycling: ~150ms per color step (≈ 1 cycle per second for all 7 colors)
    float speed = 2.0; // adjust this for faster/slower hue stepping
    int idx = int(floor(mod(vPhase * speed, 7.0)));
    finalColor = NEON_COLORS[idx];

    float pulse = 1.0 + sin(vPhase * uNeonFreq) * uNeonAmp;
    pulse = max(pulse, 0.0);
    finalColor *= pow(pulse, 1.2);
  }

  fragColor = vec4(finalColor, alpha);
}
