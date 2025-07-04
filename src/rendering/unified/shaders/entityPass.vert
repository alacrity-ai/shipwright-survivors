#version 300 es
precision mediump float;

in vec2 position;

layout(std140) uniform CameraBlock {
  mat4 uProjectionMatrix;
  mat4 uViewMatrix;
};

uniform mat4 uModelMatrix;
uniform vec2 uBlockPosition;
uniform float uBlockRotation;
uniform vec2 uBlockScale;

out vec2 vUV;
out vec2 vScreenUV;

void main() {
  vUV = vec2(position.x * 0.5 + 0.5, 1.0 - (position.y * 0.5 + 0.5));

  vec2 scaledPosition = position * uBlockScale * 0.5;
  vec2 flippedPosition = vec2(scaledPosition.x, -scaledPosition.y);

  float cos_rot = cos(uBlockRotation);
  float sin_rot = sin(uBlockRotation);
  vec2 rotatedPosition = vec2(
    flippedPosition.x * cos_rot - flippedPosition.y * sin_rot,
    flippedPosition.x * sin_rot + flippedPosition.y * cos_rot
  );

  vec2 blockWorldPosition = rotatedPosition + uBlockPosition;

  vec4 worldPos = uModelMatrix * vec4(blockWorldPosition, 0.0, 1.0);
  vec4 viewPos = uViewMatrix * worldPos;
  gl_Position = uProjectionMatrix * viewPos;

  // derive screen UV from clip-space coordinates
  vScreenUV = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
}
