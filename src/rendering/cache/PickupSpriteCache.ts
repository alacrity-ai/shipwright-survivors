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
  gradient.addColorStop(0, '#00BFFF');
  gradient.addColorStop(0.7, '#1E90FF');
  gradient.addColorStop(1, '#4682B4');

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
  gradient.addColorStop(0, '#7CFC00'); // Light green center
  gradient.addColorStop(0.7, '#32CD32'); // Lime green mid
  gradient.addColorStop(1, '#228B22'); // Darker green edge

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
