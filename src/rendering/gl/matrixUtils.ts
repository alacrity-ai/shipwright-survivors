// src/rendering/gl/webgl/matrixUtils.ts

export function createModelMatrix(
  blockX: number,
  blockY: number,
  blockRotation: number,
  shipX: number,
  shipY: number,
  shipRotation: number,
  scale: number
): Float32Array {
  // First, rotate the block's position around the ship's center
  const shipCos = Math.cos(shipRotation);
  const shipSin = Math.sin(shipRotation);
  
  const rotatedBlockX = blockX * shipCos - blockY * shipSin;
  const rotatedBlockY = blockX * shipSin + blockY * shipCos;
  
  // Calculate world position
  const worldX = shipX + rotatedBlockX;
  const worldY = shipY + rotatedBlockY;
  
  // Total rotation is ship rotation + block rotation
  const totalRotation = shipRotation + blockRotation;
  const cos = Math.cos(totalRotation);
  const sin = Math.sin(totalRotation);

  return new Float32Array([
    cos * scale, -sin * scale, 0,
    sin * scale,  cos * scale, 0,
    worldX,       worldY,      1,
  ]);
}

export function createProjectionMatrix(
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
  cameraX: number,
  cameraY: number
): Float32Array {
  const halfW = viewportWidth / (2 * zoom);
  const halfH = viewportHeight / (2 * zoom);

  const left = cameraX - halfW;
  const right = cameraX + halfW;
  const bottom = cameraY - halfH;
  const top = cameraY + halfH;

  const sx = 2 / (right - left);
  const sy = -2 / (top - bottom);  // <-- FLIPPED SIGN
  const tx = -(right + left) / (right - left);
  const ty = -(top + bottom) / (top - bottom);

  return new Float32Array([
    sx,  0,  0,
     0, sy,  0,
    tx, ty,  1,
  ]);
}
