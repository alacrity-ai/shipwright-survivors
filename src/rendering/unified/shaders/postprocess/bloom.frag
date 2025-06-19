#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uThreshold; // Brightness threshold (default: 0.7)
uniform float uIntensity; // Bloom intensity (default: 0.8)
uniform float uBlurSize; // Blur radius (default: 3.0)

void main() {
    vec2 texelSize = 1.0 / uResolution;
    
    // Sample the original color
    vec4 originalColor = texture(uTexture, vUv);
    
    // Extract bright areas first
    float brightness = dot(originalColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 brightColor = originalColor.rgb;
    
    // Soft threshold with smooth falloff
    float bloomContribution = smoothstep(uThreshold - 0.1, uThreshold + 0.1, brightness);
    brightColor *= bloomContribution;
    
    // Large radius blur using multiple rings
    vec3 bloomColor = vec3(0.0);
    float totalWeight = 0.0;
    
    // Ring 1: Inner samples (weight 4.0)
    for (int i = 0; i < 8; i++) {
        float angle = float(i) * 0.785398163; // 45 degrees in radians
        vec2 offset = vec2(cos(angle), sin(angle)) * texelSize * uBlurSize * 0.5;
        vec4 sampleColor = texture(uTexture, vUv + offset);
        float sampleBrightness = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
        float sampleContribution = smoothstep(uThreshold - 0.1, uThreshold + 0.1, sampleBrightness);
        bloomColor += sampleColor.rgb * sampleContribution * 4.0;
        totalWeight += 4.0;
    }
    
    // Ring 2: Middle samples (weight 2.0)
    for (int i = 0; i < 16; i++) {
        float angle = float(i) * 0.392699082; // 22.5 degrees in radians
        vec2 offset = vec2(cos(angle), sin(angle)) * texelSize * uBlurSize * 1.0;
        vec4 sampleColor = texture(uTexture, vUv + offset);
        float sampleBrightness = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
        float sampleContribution = smoothstep(uThreshold - 0.1, uThreshold + 0.1, sampleBrightness);
        bloomColor += sampleColor.rgb * sampleContribution * 2.0;
        totalWeight += 2.0;
    }
    
    // Ring 3: Outer samples (weight 1.0)
    for (int i = 0; i < 24; i++) {
        float angle = float(i) * 0.261799388; // 15 degrees in radians
        vec2 offset = vec2(cos(angle), sin(angle)) * texelSize * uBlurSize * 2.0;
        vec4 sampleColor = texture(uTexture, vUv + offset);
        float sampleBrightness = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
        float sampleContribution = smoothstep(uThreshold - 0.1, uThreshold + 0.1, sampleBrightness);
        bloomColor += sampleColor.rgb * sampleContribution * 1.0;
        totalWeight += 1.0;
    }
    
    // Add center sample
    bloomColor += brightColor * 6.0;
    totalWeight += 6.0;
    
    // Normalize and apply intensity
    bloomColor = (bloomColor / totalWeight) * uIntensity;
    
    // Combine original with bloom using screen blend mode for more realistic glow
    vec3 finalColor = originalColor.rgb + bloomColor;
    finalColor = finalColor / (1.0 + bloomColor); // Tone mapping to prevent oversaturation
    
    fragColor = vec4(finalColor, originalColor.a);
}