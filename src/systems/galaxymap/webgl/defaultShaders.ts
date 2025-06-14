// src/systems/galaxymap/shaders/defaultShaders.ts

// Vertex shader
export const vertexShaderSource = `
    attribute vec3 position;
    attribute vec3 normal;
    
    uniform mat4 modelMatrix;
    uniform mat4 viewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vPosition = worldPosition.xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

// Fragment shader
export const fragmentShaderSource = `
    precision mediump float;

    varying vec3 vNormal;
    varying vec3 vPosition;

    uniform vec3 color;
    uniform float alpha; // NEW
    uniform vec3 lightPosition;
    uniform vec3 lightColor;
    uniform vec3 ambientColor;

    void main() {
        vec3 lightDirection = normalize(lightPosition - vPosition);
        float lightIntensity = max(dot(vNormal, lightDirection), 0.0);

        vec3 ambient = ambientColor * color;
        vec3 diffuse = lightColor * color * lightIntensity;

        gl_FragColor = vec4(ambient + diffuse, alpha); // MODIFIED
    }
`;
