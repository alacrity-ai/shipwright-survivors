#version 300 es
precision highp float;

in vec3 vNormal;
in vec3 vWorldPosition;
in vec3 vColor;
in float vAlpha;
in vec2 vUV; // From vertex shader

uniform sampler2D planetTexture;  // NEW: planet surface texture
uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform vec3 ambientColor;

out vec4 fragColor;

void main() {
    // Normalize lighting vectors
    vec3 N = normalize(vNormal);
    vec3 L = normalize(lightPosition - vWorldPosition);
    float diffuseFactor = max(dot(N, L), 0.0);

    // Sample base texture color
    vec3 texColor = texture(planetTexture, vUV).rgb;

    // Tint sampled texture by planet's color (for variation)
    vec3 baseColor = texColor * vColor;

    // Simple Lambert lighting
    vec3 ambient = ambientColor * baseColor;
    vec3 diffuse = lightColor * baseColor * diffuseFactor;

    fragColor = vec4(ambient + diffuse, vAlpha);
}
