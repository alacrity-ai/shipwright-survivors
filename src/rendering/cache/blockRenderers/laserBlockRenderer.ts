// src/rendering/cache/blockRenderers/laserBlockRenderer.ts

export function renderLaserWeapon(
  ctx: CanvasRenderingContext2D,
  blockSize: number,
  colors: {
    body: [string, string, string, string],
    housing: string,
    innerHousing: string,
    barrel: [string, string, string],
    barrelDetail: string,
    glow: [string, string, string],
    muzzleGlow: [string, string, string, string],
    muzzleCore: string
  }
): void {
  // Body
  const bodyGradient = ctx.createLinearGradient(0, 0, 0, blockSize);
  bodyGradient.addColorStop(0, colors.body[0]);
  bodyGradient.addColorStop(0.3, colors.body[1]);
  bodyGradient.addColorStop(0.7, colors.body[2]);
  bodyGradient.addColorStop(1, colors.body[3]);
  ctx.fillStyle = bodyGradient;
  ctx.fillRect(0, 0, blockSize, blockSize);

  // Housing
  ctx.fillStyle = colors.housing;
  ctx.fillRect(2, 6, blockSize - 4, blockSize - 8);

  ctx.fillStyle = colors.innerHousing;
  ctx.fillRect(3, 7, blockSize - 6, blockSize - 10);

  // Barrel
  const barrelGradient = ctx.createLinearGradient(0, 0, blockSize, 0);
  barrelGradient.addColorStop(0, colors.barrel[0]);
  barrelGradient.addColorStop(0.5, colors.barrel[1]);
  barrelGradient.addColorStop(1, colors.barrel[2]);
  ctx.fillStyle = barrelGradient;
  ctx.fillRect(blockSize / 2 - 3, 2, 6, blockSize - 4);

  // Barrel detail
  ctx.fillStyle = colors.barrelDetail;
  ctx.fillRect(blockSize / 2 - 1, 1, 2, blockSize - 2);

  // Charging chamber
  const glowGradient = ctx.createRadialGradient(blockSize / 2, blockSize - 6, 0, blockSize / 2, blockSize - 6, 4);
  glowGradient.addColorStop(0, colors.glow[0]);
  glowGradient.addColorStop(0.7, colors.glow[1]);
  glowGradient.addColorStop(1, colors.glow[2]);
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(blockSize / 2, blockSize - 6, 4, 0, Math.PI * 2);
  ctx.fill();

  // Muzzle glow
  const muzzleGradient = ctx.createRadialGradient(blockSize / 2, 2, 0, blockSize / 2, 2, 5);
  muzzleGradient.addColorStop(0, colors.muzzleGlow[0]);
  muzzleGradient.addColorStop(0.3, colors.muzzleGlow[1]);
  muzzleGradient.addColorStop(0.6, colors.muzzleGlow[2]);
  muzzleGradient.addColorStop(1, colors.muzzleGlow[3]);
  ctx.fillStyle = muzzleGradient;
  ctx.beginPath();
  ctx.arc(blockSize / 2, 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Muzzle core
  ctx.fillStyle = colors.muzzleCore;
  ctx.beginPath();
  ctx.arc(blockSize / 2, 2, 1.5, 0, Math.PI * 2);
  ctx.fill();
}
