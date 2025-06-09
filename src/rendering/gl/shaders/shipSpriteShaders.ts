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


// src/rendering/gl/shaders/shipSpriteShaders.ts

export const VERT_SHADER_SRC = `
  precision mediump float;

  attribute vec2 position;
  uniform mat3 uModel;
  uniform mat3 uProjection;

  varying vec2 vUV;

  void main() {
    // Flip Y to match canvas convention
    vUV = vec2(position.x * 0.5 + 0.5, 1.0 - (position.y * 0.5 + 0.5));
    
    // Transform: World space -> NDC via model then projection
    vec3 worldPos = uModel * vec3(position, 1.0);
    vec3 ndcPos = uProjection * worldPos;
    
    gl_Position = vec4(ndcPos.xy, 0.0, 1.0);
  }
`;

// export const FRAG_SHADER_SRC = `
//   precision mediump float;

//   uniform sampler2D uTexture;
//   uniform float uTime;
//   uniform float uGlowStrength;
//   uniform float uEnergyPulse;
//   uniform vec3 uChargeColor;
//   uniform float uSheenStrength;

//   varying vec2 vUV;

//   void main() {
//     vec4 texColor = texture2D(uTexture, vUV);
    
//     // Base color
//     vec3 finalColor = texColor.rgb;
    
//     // Cockpit glow effect
//     if (uGlowStrength > 0.0) {
//       vec3 glowColor = vec3(0.8, 0.9, 1.0); // Cool blue-white glow
//       float glowIntensity = uGlowStrength * (0.7 + 0.3 * sin(uTime * 2.0));
//       finalColor = mix(finalColor, glowColor, glowIntensity * 0.3);
//     }
    
//     // Energy pulse effect (for batteries, reactors, shields)
//     if (length(uChargeColor) > 0.0) {
//       float pulseIntensity = uEnergyPulse * 0.4;
//       finalColor = mix(finalColor, uChargeColor, pulseIntensity);
//     }
    
//     // Metallic sheen effect
//     if (uSheenStrength > 0.0) {
//       // Simple fresnel-like effect based on UV coordinates
//       float fresnel = pow(1.0 - abs(vUV.x - 0.5) * 2.0, 2.0);
//       vec3 sheenColor = vec3(1.2, 1.2, 1.4); // Slight blue metallic tint
//       finalColor = mix(finalColor, finalColor * sheenColor, fresnel * uSheenStrength * 0.15);
//     }
    
//     gl_FragColor = vec4(finalColor, texColor.a);
//   }
// `;