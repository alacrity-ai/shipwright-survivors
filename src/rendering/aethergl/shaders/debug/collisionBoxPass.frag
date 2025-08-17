#version 300 es
precision mediump float;

out vec4 outColor;

// Simple bright debug green with semi-transparency
void main() {
    outColor = vec4(0.0, 1.0, 0.4, 0.4);  // RGBA
}
