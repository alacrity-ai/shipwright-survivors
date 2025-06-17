// Point Light Vertex Shader - unchanged
export const VERT_SHADER_SRC = `
  precision mediump float;
  
  attribute vec2 a_position;

  // Screen resolution in pixels
  uniform mediump vec2 uResolution;

  // Light center in screen space
  uniform mediump vec2 uLightPosition;

  // Light radius in pixels
  uniform mediump float uRadius;

  // Pass to fragment shader
  varying vec2 vScreenPos;

  void main() {
    // Scale quad to light radius, then translate to screen position
    vec2 scaled = a_position * uRadius;
    vec2 position = uLightPosition + scaled;

    // Convert to clip space [-1, 1]
    vec2 clip = (position / uResolution) * 2.0 - 1.0;
    clip.y = -clip.y; // flip Y for canvas-style orientation

    gl_Position = vec4(clip, 0, 1);
    vScreenPos = position;
  }
`;

// Point Light Fragment Shader - ADDED alpha modulation (Soft light blending)
export const FRAG_SHADER_SRC = `
  precision mediump float;

  uniform mediump vec2 uLightPosition;
  uniform mediump float uRadius;
  uniform mediump vec4 uColor;
  uniform mediump float uIntensity;
  uniform mediump float uFalloff;

  varying vec2 vScreenPos;

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
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// Post-processing Vertex Shader - unchanged
export const POST_VERT_SHADER_SRC = `
  attribute vec2 position;
  varying vec2 vUV;

  void main() {
    vUV = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Post-processing Fragment Shader - ADDED total brightness capping
export const POST_FRAG_SHADER_SRC = `
  precision mediump float;
  varying vec2 vUV;
  uniform sampler2D uTexture;
  uniform float uMaxBrightness;

  void main() {
    vec4 color = texture2D(uTexture, vUV);
    
    // Calculate perceptual brightness using ITU-R BT.709 luminance weights
    float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    
    // Apply brightness capping to the total accumulated lighting
    if (brightness > uMaxBrightness) {
      // Scale down while preserving color ratios (hue preservation)
      float scale = uMaxBrightness / brightness;
      color.rgb *= scale;
    }
    
    gl_FragColor = color;  
  }
`;

// Beam Vertex Shader - unchanged
export const BEAM_VERT_SHADER_SRC = `
  attribute vec2 position;
  varying vec2 vPosition;

  void main() {
    vPosition = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Beam Fragment Shader - unchanged (no individual capping needed)
export const BEAM_FRAG_SHADER_SRC = `
  precision mediump float;

  varying vec2 vPosition;

  uniform vec2 uStart;
  uniform vec2 uEnd;
  uniform float uWidth;
  uniform vec4 uColor;
  uniform float uIntensity;
  uniform float uFalloff;
  uniform vec2 uResolution;

  void main() {
    // Convert UV coordinates to pixel coordinates
    vec2 fragPos = vPosition * uResolution;
    
    // Compute beam vector
    vec2 beamDir = uEnd - uStart;
    float beamLength = length(beamDir);
    
    // Handle degenerate case (zero-length beam)
    if (beamLength < 0.001) {
      gl_FragColor = vec4(0.0);
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

    gl_FragColor = finalColor;
  }
`;
