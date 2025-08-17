#version 300 es
precision highp float;

in vec2 vUV;
in float vAlpha;
in vec3 vColor;
in float vPhase;
in float vNeonEnabled;

out vec4 fragColor;

uniform sampler2D uDigitAtlas;
uniform float uNeonFreq;
uniform float uNeonAmp;

const vec3 NEON_COLORS[7] = vec3[7](
    vec3(1.0, 0.0, 1.0), // magenta
    vec3(0.0, 1.0, 1.0), // cyan
    vec3(1.0, 1.0, 0.0), // yellow
    vec3(0.0, 1.0, 0.0), // green
    vec3(1.0, 0.0, 0.0), // red
    vec3(0.0, 0.8, 1.0), // sky blue
    vec3(1.0, 0.5, 0.0)  // orange
);

void main() {
    // Sample the main glyph
    vec4 glyph = texture(uDigitAtlas, vUV);
    
    // Compute texel size
    vec2 texel = 1.0 / vec2(textureSize(uDigitAtlas, 0));
    
    // Outline thickness - adjust this value to make outlines thicker/thinner
    float outlineWidth = 1.0;
    
    // Check if we're inside the glyph
    bool insideGlyph = glyph.a > 0.5;
    
    // If we're already inside the glyph, render the glyph normally
    if (insideGlyph) {
        float alpha = glyph.a * vAlpha;
        
        vec3 finalColor = vColor;
        
        if (vNeonEnabled > 0.5) {
            float speed = 2.0;
            int idx = int(floor(mod(vPhase * speed, 7.0)));
            finalColor = NEON_COLORS[idx];
            
            float pulse = 1.0 + sin(vPhase * uNeonFreq) * uNeonAmp;
            pulse = max(pulse, 0.0);
            finalColor *= pow(pulse, 1.2);
        }
        
        fragColor = vec4(finalColor, alpha);
        return;
    }
    
    // We're outside the glyph - check if we should draw an outline
    float maxNeighborAlpha = 0.0;
    
    // Sample in a cross pattern and diagonals for better outline detection
    vec2 offsets[8] = vec2[8](
        vec2(-1.0, 0.0), vec2(1.0, 0.0),   // left, right
        vec2(0.0, -1.0), vec2(0.0, 1.0),   // down, up
        vec2(-1.0, -1.0), vec2(1.0, -1.0), // diagonals
        vec2(-1.0, 1.0), vec2(1.0, 1.0)
    );
    
    for (int i = 0; i < 8; i++) {
        vec2 sampleUV = vUV + offsets[i] * texel * outlineWidth;
        float sampleAlpha = texture(uDigitAtlas, sampleUV).a;
        maxNeighborAlpha = max(maxNeighborAlpha, sampleAlpha);
    }
    
    // If any neighbor has significant alpha, we're in the outline region
    if (maxNeighborAlpha > 0.1) {
        // Create a smooth falloff for the outline
        float outlineAlpha = smoothstep(0.1, 0.8, maxNeighborAlpha) * vAlpha;
        
        // Black outline color
        vec3 outlineColor = vec3(0.0);
        
        fragColor = vec4(outlineColor, outlineAlpha);
    } else {
        // Completely transparent - not part of glyph or outline
        discard;
    }
}