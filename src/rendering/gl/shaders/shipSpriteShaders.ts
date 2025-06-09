// // src/rendering/gl/shaders/shipSpriteShaders.ts

// export const VERT_SHADER_SRC = `
//   precision mediump float;

//   attribute vec2 position;
//   uniform mat3 uTransform;

//   varying vec2 vUV;

//   void main() {
//     // Flip Y for UV to match canvas coordinate origin
//     vUV = vec2(position.x * 0.5 + 0.5, 1.0 - (position.y * 0.5 + 0.5));

//     vec3 pos = uTransform * vec3(position, 1.0);
//     gl_Position = vec4(pos.xy, 0.0, 1.0);
//   }
// `;


// export const FRAG_SHADER_SRC = `
//   precision mediump float;

//   varying vec2 vUV;
//   uniform sampler2D uTexture;

//   void main() {
//     vec4 texColor = texture2D(uTexture, vUV);
//     if (texColor.a < 0.01) discard;
//     gl_FragColor = texColor;
//   }
// `;

// src/rendering/gl/shaders/shipSpriteShaders.ts

// export const VERT_SHADER_SRC = `
//   precision mediump float;

//   attribute vec2 position;
//   uniform mat3 uTransform;

//   varying vec2 vUV;

//   void main() {
//     // Flip Y to match canvas convention
//     vUV = vec2(position.x * 0.5 + 0.5, 1.0 - (position.y * 0.5 + 0.5));
//     vec3 pos = uTransform * vec3(position, 1.0);
//     gl_Position = vec4(pos.xy, 0.0, 1.0);
//   }
// `;

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

  void main() {
    vec4 base = texture2D(uTexture, vUV);
    if (base.a < 0.01) discard;

    // === Radial Charge Bloom ===
    vec2 centeredUV = vUV - 0.5;
    float dist = length(centeredUV);
    
    // Smoother, slower pulse that radiates outward
    float wavePhase = uTime * 3.0 - dist * 8.0;
    float pulse = sin(wavePhase) * 0.5 + 0.5;
    pulse = pow(pulse, 2.0); // Square for sharper peaks
    
    // Better falloff with more control
    float innerRadius = 0.1;
    float outerRadius = 0.4;
    float falloff = 1.0 - smoothstep(innerRadius, outerRadius, dist);
    falloff = pow(falloff, 1.5); // More concentrated near center
    
    float energy = pulse * falloff * uEnergyPulse;
    base.rgb += uChargeColor * energy * 0.8;

    // === Pulsating Glow ===
    // Slower, smoother breathing effect
    float breathe = sin(uTime * 2.5) * 0.3 + 0.7;
    breathe = smoothstep(0.4, 1.0, breathe); // Smoother transitions
    base.rgb += base.rgb * uGlowStrength * breathe * 0.3;

    // === Metallic Sheen ===
    if (uSheenStrength > 0.0) {
      // Subtle metallic surface enhancement
      vec2 centeredUV = vUV - 0.5;
      float dist = length(centeredUV);
      
      // Gentle radial gradient for metallic reflection
      float radialFalloff = 1.0 - smoothstep(0.0, 0.7, dist);
      radialFalloff = pow(radialFalloff, 0.8);
      
      // Add some texture variation to break up uniformity
      float noise = sin(vUV.x * 12.0) * sin(vUV.y * 8.0) * 0.1 + 0.9;
      
      // Combine for subtle metallic enhancement
      float metallic = radialFalloff * noise;
      
      // Boost the existing color with metallic qualities
      // Increase contrast and add slight blue tint
      vec3 metallicColor = base.rgb * 1.2 + vec3(0.05, 0.05, 0.1);
      base.rgb = mix(base.rgb, metallicColor, uSheenStrength * metallic * 0.3);
      
      // Add subtle specular-like brightness
      base.rgb += uSheenStrength * metallic * 0.15;
    }

    gl_FragColor = base;
  }
`;

// export const FRAG_SHADER_SRC = `
//   precision mediump float;

//   varying vec2 vUV;
//   uniform sampler2D uTexture;
//   uniform float uTime;
//   uniform float uGlowStrength;
//   uniform float uEnergyPulse; // 0 to 1 normalized intensity
//   uniform vec3 uChargeColor;
//   uniform float uSheenStrength; // 0 if disabled, 1 for full effect
//   uniform float uEngineFireStrength; // 0 to 1, controls fire intensity
//   uniform vec2 uEngineFireDirection; // Normalized direction vector for fire

//   // Simple noise function for fire turbulence
//   float noise(vec2 p) {
//     return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
//   }

//   // Fractal noise for more organic fire movement
//   float fractalNoise(vec2 p) {
//     float value = 0.0;
//     float amplitude = 0.5;
    
//     for (int i = 0; i < 3; i++) {
//       value += noise(p) * amplitude;
//       p *= 2.0;
//       amplitude *= 0.5;
//     }
    
//     return value;
//   }

//   void main() {
//     vec4 base = texture2D(uTexture, vUV);
//     if (base.a < 0.01) discard;

//     // === EXTREME Engine Fire Effect ===
//     if (uEngineFireStrength > 0.0) {
//       // Use extended UV coordinates that go way beyond 0-1 range
//       vec2 extendedUV = (vUV - 0.5) * 3.0; // Triple the coordinate range!
      
//       // Project UV onto fire direction to create elongated fire trail
//       float fireProjection = dot(extendedUV, uEngineFireDirection);
//       vec2 perpendicular = extendedUV - fireProjection * uEngineFireDirection;
//       float perpDistance = length(perpendicular);
      
//       // Fire extends MASSIVELY outward from the block
//       if (fireProjection > 0.0 && fireProjection < 4.0) { // Extended range
//         // Much more aggressive fire scaling
//         float fireLength = fireProjection;
//         float fireWidth = perpDistance;
        
//         // Multiple layers of turbulence for chaos
//         vec2 turbulenceUV1 = vUV * 8.0 + vec2(uTime * 2.0, uTime * 1.5);
//         vec2 turbulenceUV2 = vUV * 12.0 + vec2(uTime * -1.8, uTime * 2.2);
//         float turbulence1 = fractalNoise(turbulenceUV1 + fireLength);
//         float turbulence2 = fractalNoise(turbulenceUV2 - fireLength * 0.5);
//         float turbulence = (turbulence1 + turbulence2 * 0.7) * 0.6;
        
//         // MUCH wider fire trail
//         float baseWidth = 0.1;
//         float maxWidth = 0.8 + turbulence * 0.3;
//         float expectedWidth = baseWidth + (maxWidth - baseWidth) * pow(fireLength * 0.4, 0.7);
        
//         // More dramatic width variation
//         expectedWidth += sin(uTime * 6.0 + fireLength * 4.0) * 0.15;
//         expectedWidth += turbulence * 0.2;
        
//         // Softer, more dramatic falloff
//         float widthFalloff = 1.0 - smoothstep(0.0, expectedWidth, fireWidth);
//         widthFalloff = pow(widthFalloff, 0.6); // Softer edges
        
//         float lengthFalloff = 1.0 - pow(fireLength * 0.25, 1.2);
//         lengthFalloff = max(0.0, lengthFalloff);
        
//         // INTENSE flickering with multiple frequencies
//         float flicker1 = sin(uTime * 12.0 + fireLength * 5.0) * 0.3 + 0.7;
//         float flicker2 = sin(uTime * 8.0 + turbulence * 8.0) * 0.2 + 0.8;
//         float flicker3 = sin(uTime * 20.0 + fireLength * 2.0) * 0.15 + 0.85;
//         float flicker = flicker1 * flicker2 * flicker3;
        
//         // Combine all factors with MUCH higher intensity
//         float fireIntensity = widthFalloff * lengthFalloff * flicker * uEngineFireStrength;
//         fireIntensity = pow(fireIntensity, 0.8); // Brighten the effect
        
//         if (fireIntensity > 0.005) {
//           // More dramatic color gradient
//           vec3 fireColorCore = vec3(0.9, 0.9, 1.0);     // White-hot core
//           vec3 fireColorBlue = vec3(0.3, 0.5, 1.0);     // Blue flame
//           vec3 fireColorOrange = vec3(1.0, 0.4, 0.1);   // Bright orange
//           vec3 fireColorRed = vec3(1.0, 0.1, 0.0);      // Deep red
//           vec3 fireColorDark = vec3(0.3, 0.0, 0.0);     // Dark red tips
          
//           // Multi-stage color interpolation
//           vec3 fireColor;
//           float colorPos = fireLength * 0.8;
          
//           if (colorPos < 0.2) {
//             fireColor = mix(fireColorCore, fireColorBlue, colorPos * 5.0);
//           } else if (colorPos < 0.6) {
//             fireColor = mix(fireColorBlue, fireColorOrange, (colorPos - 0.2) * 2.5);
//           } else if (colorPos < 1.2) {
//             fireColor = mix(fireColorOrange, fireColorRed, (colorPos - 0.6) * 1.67);
//           } else {
//             fireColor = mix(fireColorRed, fireColorDark, min(1.0, (colorPos - 1.2) * 2.0));
//           }
          
//           // Add center hotspot that's MUCH brighter
//           float hotSpot = exp(-fireWidth * 3.0) * exp(-fireLength * 0.5);
//           fireColor = mix(fireColor, vec3(1.2, 1.2, 1.0), hotSpot * 0.8);
          
//           // MUCH more aggressive blending - this fire DOMINATES
//           float blendFactor = fireIntensity * 2.5; // Much stronger
//           base.rgb = mix(base.rgb, fireColor, min(1.0, blendFactor));
//           base.rgb += fireColor * fireIntensity * 1.5; // INTENSE additive glow
          
//           // Boost alpha for fire regions to make them pop
//           base.a = max(base.a, fireIntensity * 0.8);
//         }
//       }
//     }

//     // === Radial Charge Bloom ===
//     vec2 centeredUV = vUV - 0.5;
//     float dist = length(centeredUV);
    
//     // Smoother, slower pulse that radiates outward
//     float wavePhase = uTime * 3.0 - dist * 8.0;
//     float pulse = sin(wavePhase) * 0.5 + 0.5;
//     pulse = pow(pulse, 2.0); // Square for sharper peaks
    
//     // Better falloff with more control
//     float innerRadius = 0.1;
//     float outerRadius = 0.4;
//     float falloff = 1.0 - smoothstep(innerRadius, outerRadius, dist);
//     falloff = pow(falloff, 1.5); // More concentrated near center
    
//     float energy = pulse * falloff * uEnergyPulse;
//     base.rgb += uChargeColor * energy * 0.8;

//     // === Pulsating Glow ===
//     // Slower, smoother breathing effect
//     float breathe = sin(uTime * 2.5) * 0.3 + 0.7;
//     breathe = smoothstep(0.4, 1.0, breathe); // Smoother transitions
//     base.rgb += base.rgb * uGlowStrength * breathe * 0.3;

//     // === Metallic Sheen ===
//     if (uSheenStrength > 0.0) {
//       // Subtle metallic surface enhancement
//       vec2 centeredUV = vUV - 0.5;
//       float dist = length(centeredUV);
      
//       // Gentle radial gradient for metallic reflection
//       float radialFalloff = 1.0 - smoothstep(0.0, 0.7, dist);
//       radialFalloff = pow(radialFalloff, 0.8);
      
//       // Add some texture variation to break up uniformity
//       float noise = sin(vUV.x * 12.0) * sin(vUV.y * 8.0) * 0.1 + 0.9;
      
//       // Combine for subtle metallic enhancement
//       float metallic = radialFalloff * noise;
      
//       // Boost the existing color with metallic qualities
//       // Increase contrast and add slight blue tint
//       vec3 metallicColor = base.rgb * 1.2 + vec3(0.05, 0.05, 0.1);
//       base.rgb = mix(base.rgb, metallicColor, uSheenStrength * metallic * 0.3);
      
//       // Add subtle specular-like brightness
//       base.rgb += uSheenStrength * metallic * 0.15;
//     }

//     gl_FragColor = base;
//   }
// `;