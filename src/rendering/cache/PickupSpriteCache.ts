// src/rendering/cache/PickupSpriteCache.ts

const PICKUP_SIZE = 8; // Set the size to 8x8 for smaller pickups, or change to 6 if you'd prefer it even smaller

export interface PickupSprite {
  base: HTMLCanvasElement; // The base canvas with the sprite
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
  const baseCtx = baseCanvas.getContext('2d')!;

  // Create a gradient for the blue orb
  const orbGradient = baseCtx.createRadialGradient(PICKUP_SIZE / 2, PICKUP_SIZE / 2, 0, PICKUP_SIZE / 2, PICKUP_SIZE / 2, PICKUP_SIZE / 2);
  orbGradient.addColorStop(0, '#00BFFF'); // Light blue center
  orbGradient.addColorStop(0.7, '#1E90FF'); // Slightly darker blue
  orbGradient.addColorStop(1, '#4682B4'); // Dark blue edge

  baseCtx.fillStyle = orbGradient;
  baseCtx.beginPath();
  baseCtx.arc(PICKUP_SIZE / 2, PICKUP_SIZE / 2, PICKUP_SIZE / 2, 0, Math.PI * 2);
  baseCtx.fill();

  return baseCanvas; // Return the created canvas
}

export function initializePickupSpriteCache(): void {
  // Generate the sprite for currency pickups and store it in the cache
  const currencyPickupSprite: PickupSprite = { base: drawCurrencyPickup() };

  // Store the sprite in the cache
  spriteCache.set('currency', currencyPickupSprite);
}

// Retrieve a sprite by typeId (for future expandability)
export function getPickupSprite(typeId: string): PickupSprite | undefined {
  return spriteCache.get(typeId);
}
