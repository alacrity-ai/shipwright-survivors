#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

// Underwater effect parameters
uniform float uWaveIntensity;     // Default: 0.015
uniform float uWaveSpeed;         // Default: 1.0
uniform float uCausticIntensity;  // Default: 0.3
uniform float uDepthTint;         // Default: 0.6
uniform float uBubbleIntensity;   // Default: 0.1
uniform float uDistortionAmount;  // Default: 0.008

// === Utility Functions ===

// Simple noise function
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Fractal Brownian Motion for more complex noise
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < 4; i++) {
        value += amplitude * (noise(p * frequency) * 2.0 - 1.0);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return value;
}

// Generate caustic patterns
float caustics(vec2 uv, float time) {
    vec2 p = uv * 8.0;
    
    // Multiple layers of caustics with different frequencies
    float c1 = sin(p.x * 3.0 + time * 2.0) * cos(p.y * 2.5 + time * 1.5);
    float c2 = sin(p.x * 1.5 + time * 1.2) * cos(p.y * 4.0 + time * 2.3);
    float c3 = sin(p.x * 5.0 + time * 0.8) * cos(p.y * 1.8 + time * 1.8);
    
    float caustic = (c1 + c2 * 0.5 + c3 * 0.3) * 0.5 + 0.5;
    
    // Add some randomness
    caustic += fbm(p + time * 0.1) * 0.2;
    
    return clamp(caustic, 0.0, 1.0);
}

// Create wave distortion
vec2 waveDistortion(vec2 uv, float time) {
    float wave1 = sin(uv.y * 10.0 + time * uWaveSpeed * 2.0) * uDistortionAmount;
    float wave2 = cos(uv.x * 8.0 + time * uWaveSpeed * 1.5) * uDistortionAmount * 0.7;
    float wave3 = sin((uv.x + uv.y) * 6.0 + time * uWaveSpeed * 1.2) * uDistortionAmount * 0.5;
    
    return vec2(wave1 + wave3, wave2 + wave3 * 0.5);
}

// Simulate floating particles/bubbles
float bubbles(vec2 uv, float time) {
    vec2 p = uv * 15.0;
    p.y -= time * 0.5; // Make bubbles rise
    
    float bubble = 0.0;
    
    // Multiple bubble layers
    for(int i = 0; i < 3; i++) {
        vec2 bubblePos = p + vec2(float(i) * 3.7, float(i) * 2.3);
        bubblePos = fract(bubblePos);
        
        float dist = length(bubblePos - 0.5);
        float size = 0.05 + noise(vec2(float(i))) * 0.03;
        
        if(dist < size) {
            bubble += (1.0 - dist / size) * 0.3;
        }
    }
    
    return clamp(bubble, 0.0, 1.0);
}

// Underwater color grading
vec3 underwaterTint(vec3 color, float depth) {
    // Blue-green underwater tint
    vec3 deepWaterColor = vec3(0.1, 0.3, 0.6);
    vec3 shallowWaterColor = vec3(0.3, 0.7, 0.8);
    
    vec3 waterTint = mix(shallowWaterColor, deepWaterColor, depth);
    
    // Reduce red channel (red light is absorbed first underwater)
    color.r *= 0.6 + (1.0 - depth) * 0.4;
    color.g *= 0.8 + (1.0 - depth) * 0.2;
    
    return mix(color, color * waterTint, uDepthTint);
}

void main() {
    vec2 uv = vUv;
    
    // Apply wave distortion to UV coordinates
    vec2 distortedUv = uv + waveDistortion(uv, uTime) * uWaveIntensity;
    
    // Sample the original texture with distorted coordinates
    vec4 originalColor = texture(uTexture, distortedUv);
    vec3 color = originalColor.rgb;
    
    // Calculate depth based on vertical position (deeper at bottom)
    float depth = 1.0 - uv.y;
    depth = smoothstep(0.0, 1.0, depth);
    
    // Apply underwater color tinting
    color = underwaterTint(color, depth);
    
    // Generate caustic lighting
    float causticPattern = caustics(uv, uTime);
    
    // Apply caustics as additive lighting
    vec3 causticColor = vec3(0.8, 1.0, 1.2) * causticPattern * uCausticIntensity;
    color += causticColor * (1.0 - depth * 0.5); // Caustics are stronger near surface
    
    // Add subtle bubble effects
    float bubbleEffect = bubbles(uv, uTime);
    color += vec3(0.9, 1.0, 1.1) * bubbleEffect * uBubbleIntensity;
    
    // Add some subtle chromatic aberration for underwater refraction
    float aberration = 0.002 * (1.0 + sin(uTime * 0.5) * 0.5);
    vec2 aberrationUv1 = distortedUv + vec2(aberration, 0.0);
    vec2 aberrationUv2 = distortedUv - vec2(aberration, 0.0);
    
    if(aberrationUv1.x >= 0.0 && aberrationUv1.x <= 1.0 && aberrationUv1.y >= 0.0 && aberrationUv1.y <= 1.0) {
        color.r = texture(uTexture, aberrationUv1).r;
    }
    if(aberrationUv2.x >= 0.0 && aberrationUv2.x <= 1.0 && aberrationUv2.y >= 0.0 && aberrationUv2.y <= 1.0) {
        color.b = texture(uTexture, aberrationUv2).b;
    }
    
    // Add some overall brightness variation to simulate light filtering through water
    float lightVariation = 0.9 + 0.1 * sin(uTime * 0.3 + uv.x * 2.0 + uv.y * 1.5);
    color *= lightVariation;
    
    // Darken the image slightly to simulate being underwater
    color *= 0.85;
    
    // Clamp the result
    color = clamp(color, 0.0, 1.0);
    
    fragColor = vec4(color, originalColor.a);
}