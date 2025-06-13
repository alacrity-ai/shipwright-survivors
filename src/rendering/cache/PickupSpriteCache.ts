const PICKUP_SIZE = 8; // 8x8 pixel size

export interface PickupSprite {
  base: HTMLCanvasElement;
}

const spriteCache: Map<string, PickupSprite> = new Map();

function createBlankCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = PICKUP_SIZE;
  canvas.height = PICKUP_SIZE;
  return canvas;
}

function drawCurrencyPickup(): HTMLCanvasElement {
  const baseCanvas = createBlankCanvas();
  const ctx = baseCanvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(
    PICKUP_SIZE / 2, PICKUP_SIZE / 2, 0,
    PICKUP_SIZE / 2, PICKUP_SIZE / 2, PICKUP_SIZE / 2
  );
  // Farther on the color wheel: #0500FF
  gradient.addColorStop(0.0, '#ffcc00'); // Bright gold center
  gradient.addColorStop(0.6, '#ffaa00'); // Amber midtone
  gradient.addColorStop(1.0, '#cc6600'); // Deep orange-gold edge

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(PICKUP_SIZE / 2, PICKUP_SIZE / 2, PICKUP_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();

  return baseCanvas;
}

function drawRepairPickup(): HTMLCanvasElement {
  const baseCanvas = createBlankCanvas();
  const ctx = baseCanvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(
    PICKUP_SIZE / 2, PICKUP_SIZE / 2, 0,
    PICKUP_SIZE / 2, PICKUP_SIZE / 2, PICKUP_SIZE / 2
  );
  // Farther on the color wheel: #00FF05
  gradient.addColorStop(0.0, '#ff6666'); // Bright core (health red)
  gradient.addColorStop(0.7, '#cc2222'); // Midrange red (warm, visceral)
  gradient.addColorStop(1.0, '#880000'); // Outer edge (deep crimson)

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(PICKUP_SIZE / 2, PICKUP_SIZE / 2, PICKUP_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();

  return baseCanvas;
}

export function initializePickupSpriteCache(): void {
  spriteCache.set('currency', { base: drawCurrencyPickup() });
  spriteCache.set('repair', { base: drawRepairPickup() });
}

export function getPickupSprite(typeId: string): PickupSprite | undefined {
  return spriteCache.get(typeId);
}
