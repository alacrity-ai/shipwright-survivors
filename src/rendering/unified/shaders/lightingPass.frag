#version 300 es
precision mediump float;

// src/rendering/unified/shaders/lightingPass.frag

// Point Light Fragment Shader - WebGL 2 version with alpha modulation
uniform vec2 uLightPosition;
uniform float uRadius;
uniform vec4 uColor;
uniform float uIntensity;
uniform float uFalloff;

in vec2 vScreenPos;
out vec4 fragColor;

void main() {
  float dist = distance(vScreenPos, uLightPosition);
  float normDist = clamp(dist / uRadius, 0.0, 1.0);

  // Smooth radial falloff
  float falloff = pow(1.0 - normDist, 2.0);
  falloff *= uFalloff;

  vec3 color = uColor.rgb * falloff * uIntensity;
  
  // Use alpha to control blending behavior
  // Lower alpha = more natural blending, less stacking
  float alpha = falloff * uIntensity * 0.7; // Reduced from 1.0 to prevent over-stacking
  
  fragColor = vec4(color, alpha);
}