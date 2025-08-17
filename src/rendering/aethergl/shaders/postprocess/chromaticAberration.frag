#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uStrength; // Aberration strength (default: 0.003)
uniform float uFalloff; // Distance falloff (default: 2.0)

void main() {
    // Calculate distance from center (0.0 to ~0.707)
    vec2 center = vec2(0.5, 0.5);
    vec2 offset = vUv - center;
    float distance = length(offset);
    
    // Create radial aberration that's stronger at edges
    float aberration = uStrength * pow(distance, uFalloff);
    
    // Direction from center to current pixel
    vec2 direction = normalize(offset);
    
    // Sample RGB channels at slightly different positions
    // Red channel - sample inward (closer to center)
    vec2 redUv = vUv - direction * aberration;
    float red = texture(uTexture, redUv).r;
    
    // Green channel - sample at original position
    float green = texture(uTexture, vUv).g;
    
    // Blue channel - sample outward (further from center)
    vec2 blueUv = vUv + direction * aberration;
    float blue = texture(uTexture, blueUv).b;
    
    // Get alpha from original position
    float alpha = texture(uTexture, vUv).a;
    
    fragColor = vec4(red, green, blue, alpha);
}
