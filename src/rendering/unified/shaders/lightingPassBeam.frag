#version 300 es

precision mediump float;

// src/rendering/unified/shaders/lightingPassBeam.frag

// Beam Fragment Shader - WebGL 2 version
in vec2 vPosition;

uniform vec2 uStart;
uniform vec2 uEnd;
uniform float uWidth;
uniform vec4 uColor;
uniform float uIntensity;
uniform float uFalloff;
uniform vec2 uResolution;

out vec4 fragColor;

void main() {
  // Convert UV coordinates to pixel coordinates
  vec2 fragPos = vPosition * uResolution;
  
  // Compute beam vector
  vec2 beamDir = uEnd - uStart;
  float beamLength = length(beamDir);
  
  // Handle degenerate case (zero-length beam)
  if (beamLength < 0.001) {
    fragColor = vec4(0.0);
    return;
  }
  
  vec2 normDir = beamDir / beamLength;

  // Project fragment onto beam axis
  vec2 delta = fragPos - uStart;
  float t = clamp(dot(delta, normDir), 0.0, beamLength);

  // Closest point on beam line segment
  vec2 closest = uStart + t * normDir;
  float dist = length(fragPos - closest);

  // Gaussian falloff based on distance from beam centerline
  float falloff = exp(-pow(dist / max(uWidth, 0.1), 2.0)) * uFalloff;

  vec4 finalColor = uColor * falloff * uIntensity;
  finalColor.a = falloff;

  fragColor = finalColor;
}