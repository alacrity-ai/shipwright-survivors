// src/rendering/gl/shaders/shipSpriteShaders.ts

export const VERT_SHADER_SRC = `
  precision mediump float;

  attribute vec2 position;

  uniform mat4 uProjectionMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uModelMatrix;
  uniform vec2 uBlockPosition;
  uniform float uBlockRotation;
  uniform vec2 uBlockScale;

  varying vec2 vUV;

  void main() {
    // Compute UV coordinates (Y-flipped for WebGL)
    vUV = vec2(position.x * 0.5 + 0.5, 1.0 - (position.y * 0.5 + 0.5));

    // Flip Y to match canvas-style asset orientation
    vec2 scaledPosition = position * uBlockScale * 0.5;
    vec2 flippedPosition = vec2(scaledPosition.x, -scaledPosition.y);

    // Apply rotation
    float cos_rot = cos(uBlockRotation);
    float sin_rot = sin(uBlockRotation);
    vec2 rotatedPosition = vec2(
      flippedPosition.x * cos_rot - flippedPosition.y * sin_rot,
      flippedPosition.x * sin_rot + flippedPosition.y * cos_rot
    );

    // Translate to block-local world position
    vec2 blockWorldPosition = rotatedPosition + uBlockPosition;

    // Full transform pipeline
    vec4 worldPos = uModelMatrix * vec4(blockWorldPosition, 0.0, 1.0);
    vec4 viewPos = uViewMatrix * worldPos;
    gl_Position = uProjectionMatrix * viewPos;
  }
`;

export const FRAG_SHADER_SRC = `
  precision mediump float;

  varying vec2 vUV;
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uGlowStrength;
  uniform float uEnergyPulse; // 0 to 1 normalized intensity
  uniform vec3 uChargeColor;
  uniform float uSheenStrength; // 0 if disabled, 1 for full effect
  uniform vec3 uCollisionColor;
  uniform bool uUseCollisionColor;

  // === NEW UNIFORMS FOR BLOCK COLORING ===
  uniform vec3 uBlockColor;
  uniform float uBlockColorIntensity;
  uniform bool uUseBlockColor;

  void main() {
    vec4 base = texture2D(uTexture, vUV);
    if (base.a < 0.01) discard;

    // === Radial Charge Bloom ===
    vec2 centeredUV = vUV - 0.5;
    float dist = length(centeredUV);
    
    float wavePhase = uTime * 3.0 - dist * 8.0;
    float pulse = sin(wavePhase) * 0.5 + 0.5;
    pulse = pow(pulse, 2.0);
    
    float innerRadius = 0.1;
    float outerRadius = 0.4;
    float falloff = 1.0 - smoothstep(innerRadius, outerRadius, dist);
    falloff = pow(falloff, 1.5);
    
    float energy = pulse * falloff * uEnergyPulse;
    base.rgb += uChargeColor * energy * 0.8;

    // === Pulsating Glow ===
    float breathe = sin(uTime * 2.5) * 0.3 + 0.7;
    breathe = smoothstep(0.4, 1.0, breathe);
    base.rgb += base.rgb * uGlowStrength * breathe * 0.3;

    // === Metallic Sheen ===
    if (uSheenStrength > 0.0) {
      float radialFalloff = 1.0 - smoothstep(0.0, 0.7, dist);
      radialFalloff = pow(radialFalloff, 0.8);
      float noise = sin(vUV.x * 12.0) * sin(vUV.y * 8.0) * 0.1 + 0.9;
      float metallic = radialFalloff * noise;
      vec3 metallicColor = base.rgb * 1.2 + vec3(0.05, 0.05, 0.1);
      base.rgb = mix(base.rgb, metallicColor, uSheenStrength * metallic * 0.3);
      base.rgb += uSheenStrength * metallic * 0.15;
    }

    // === Block Color Override ===
    if (uUseBlockColor) {
      base.rgb = mix(base.rgb, base.rgb * uBlockColor, uBlockColorIntensity);
    }

    // === Collision Red Override ===
    if (uUseCollisionColor) {
      base.rgb = uCollisionColor;
    }

    gl_FragColor = base;
  }
`;
