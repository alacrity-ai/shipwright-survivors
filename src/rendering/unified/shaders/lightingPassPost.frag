#version 300 es
precision mediump float;

// src/rendering/unified/shaders/lightingPassPost.frag

// Post-processing Fragment Shader - WebGL 2 version with brightness capping
in vec2 vUV;
uniform sampler2D uTexture;
uniform float uMaxBrightness;

out vec4 fragColor;

void main() {
  vec4 color = texture(uTexture, vUV);
  
  // Calculate perceptual brightness using ITU-R BT.709 luminance weights
  float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  
  // Apply brightness capping to the total accumulated lighting
  if (brightness > uMaxBrightness) {
    // Scale down while preserving color ratios (hue preservation)
    float scale = uMaxBrightness / brightness;
    color.rgb *= scale;
  }
  
  fragColor = color;  
}