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
  gradient.addColorStop(0, '#0091ff');   // Deep blue-violet center
  gradient.addColorStop(0.6, '#0066FF'); // Bright blue mid
  gradient.addColorStop(1, '#003399');   // Navy blue edge

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
  gradient.addColorStop(0, '#66FF00');   // Bright lime center
  gradient.addColorStop(0.7, '#44CC00'); // Forest lime mid
  gradient.addColorStop(1, '#228800');   // Deep forest green edge

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
