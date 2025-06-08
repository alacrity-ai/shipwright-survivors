// src/lighting/webgl/defaultShaders.ts

/** Vertex shader for fullscreen quad */
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

export const FRAG_SHADER_SRC = `
  precision mediump float;

  uniform mediump vec2 uLightPosition;
  uniform mediump float uRadius;
  uniform mediump vec4 uColor;
  uniform mediump float uIntensity;
  uniform mediump float uFalloff;
  uniform mediump float uMaxBrightness;

  varying vec2 vScreenPos;

  void main() {
    float dist = distance(vScreenPos, uLightPosition);
    float normDist = clamp(dist / uRadius, 0.0, 1.0);

    // Smooth radial falloff
    float falloff = pow(1.0 - normDist, 2.0);
    falloff *= uFalloff;

    vec3 color = uColor.rgb * falloff * uIntensity;

    // Perceptual luminance approximation (ITU-R BT.709)
    float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));

    // Soft clamp: compress brightness into [0, uMaxBrightness]
    float clamped = brightness / (1.0 + brightness / uMaxBrightness);
    vec3 finalColor = color * (clamped / max(brightness, 0.0001)); // preserve hue

    gl_FragColor = vec4(finalColor, uColor.a * falloff * uIntensity);
  }
`;


export const POST_VERT_SHADER_SRC = `
  attribute vec2 position;
  varying vec2 vUV;

  void main() {
    vUV = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

export const POST_FRAG_SHADER_SRC = `
  precision mediump float;
  varying vec2 vUV;
  uniform sampler2D uTexture;

  void main() {
    gl_FragColor = texture2D(uTexture, vUV);
  }
`;

export const BEAM_VERT_SHADER_SRC = `
  attribute vec2 position;

  varying vec2 vPosition;

  void main() {
    vPosition = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

export const BEAM_FRAG_SHADER_SRC = `
  precision mediump float;

  varying vec2 vPosition;

  uniform vec2 uStart;
  uniform vec2 uEnd;
  uniform float uWidth;
  uniform vec4 uColor;
  uniform float uIntensity;
  uniform float uFalloff;

  void main() {
    // Compute beam vector and perpendicular width space
    vec2 beamDir = uEnd - uStart;
    float beamLength = length(beamDir);
    vec2 normDir = normalize(beamDir);

    // Project fragment onto beam axis
    vec2 fragPos = vPosition * vec2(1.0); // framebuffer-relative [0,1]
    vec2 delta = fragPos - uStart;
    float t = clamp(dot(delta, normDir), 0.0, beamLength);

    // Closest point on beam
    vec2 closest = uStart + t * normDir;
    float dist = length(fragPos - closest);

    // Gaussian falloff
    float falloff = exp(-pow(dist / uWidth, 2.0)) * uFalloff;

    vec4 finalColor = uColor * falloff * uIntensity;
    finalColor.a = falloff;

    gl_FragColor = finalColor;
  }
`;