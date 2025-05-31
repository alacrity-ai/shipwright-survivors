// src/systems/pickups/PickupSystem.ts

import { getPickupSprite } from '@/rendering/cache/PickupSpriteCache';
import { PlayerResources } from '@/game/player/PlayerResources';
import { ParticleManager } from '@/systems/fx/ParticleManager';

import type { ParticleOptions } from '@/systems/fx/ParticleManager';
import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';
import type { PickupInstance } from '@/game/interfaces/entities/PickupInstance';
import type { Ship } from '@/game/ship/Ship';

const PICKUP_RADIUS = 16;
const PICKUP_RANGE_PER_HARVEST_UNIT = 48;
const ATTRACTION_SPEED = 10;
const PICKUP_ATTRACTION_EXPONENT = 2.0;
const CULL_PADDING = 128;

const SPARK_OPTIONS: ParticleOptions = {
  colors: ['#00f', '#009', '#00a9f4', '#1e90ff'],
  baseSpeed: 50,
  sizeRange: [1, 4],
  lifeRange: [1, 2],
  fadeOut: true,
};

export class PickupSystem {
  private ctx: CanvasRenderingContext2D;
  private pickups: PickupInstance[] = [];
  private playerResources: PlayerResources;
  private playerShip: Ship;
  private sparkManager: ParticleManager;

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera,
    playerShip: Ship,
    sparkManager: ParticleManager
  ) {
    this.ctx = canvasManager.getContext('entities');
    this.playerResources = PlayerResources.getInstance();
    this.playerShip = playerShip;
    this.sparkManager = sparkManager
  }

  spawnCurrencyPickup(position: { x: number; y: number }, amount: number): void {
    const newPickup: PickupInstance = {
      type: {
        id: 'currency',
        name: 'Gold Coin',
        currencyAmount: amount,
        category: 'currency',
        sprite: 'currency',
      },
      position,
      isPickedUp: false,
      currencyAmount: amount,
      rotation: 0,
    };
    this.pickups.push(newPickup);
  }

  render(dt: number): void { // Added dt
    const viewport = this.camera.getViewportBounds();
    const minX = viewport.x - CULL_PADDING;
    const minY = viewport.y - CULL_PADDING;
    const maxX = viewport.x + viewport.width + CULL_PADDING;
    const maxY = viewport.y + viewport.height + CULL_PADDING;

    for (const pickup of this.pickups) {
      const { x, y } = pickup.position;
      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      const sprite = getPickupSprite(pickup.type.id);
      if (!sprite) {
        console.error('No sprite found for pickup type:', pickup.type.id);
        continue;
      }

      const screenPosition = this.camera.worldToScreen(x, y);
      pickup.rotation += 0.7;

      const scaleFactor = Math.log2(pickup.currencyAmount + 1) / 5;
      const scale = this.camera.zoom * (0.5 + scaleFactor);

      this.ctx.save();
      this.ctx.translate(screenPosition.x, screenPosition.y);
      this.ctx.rotate(pickup.rotation);
      this.ctx.scale(scale, scale);
      this.ctx.drawImage(
        sprite.base,
        -PICKUP_RADIUS,
        -PICKUP_RADIUS,
        PICKUP_RADIUS * 2,
        PICKUP_RADIUS * 2
      );
      this.ctx.restore();

      // Emit spark effect only if within camera viewport (world space)
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        this.sparkManager.emitContinuous(pickup.position, dt, 10, SPARK_OPTIONS);
      }
    }
  }

  update(): void {
    const shipPosition = this.playerShip.getTransform().position;

    const baseAttractionRange = 600;
    const bonusRange = this.playerShip.getTotalHarvestRate() * PICKUP_RANGE_PER_HARVEST_UNIT;
    const attractionRange = baseAttractionRange + bonusRange;
    const attractionRangeSq = attractionRange * attractionRange;

    const pickupRadiusSq = PICKUP_RADIUS * PICKUP_RADIUS;

    for (const pickup of this.pickups) {
      if (pickup.isPickedUp) continue;

      const dx = shipPosition.x - pickup.position.x;
      const dy = shipPosition.y - pickup.position.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > attractionRangeSq) continue;

      const normalizedDistanceSq = distSq / attractionRangeSq;
      const attractionMultiplier = Math.pow(1 - normalizedDistanceSq, PICKUP_ATTRACTION_EXPONENT);
      const attractionSpeed = ATTRACTION_SPEED * attractionMultiplier;

      const distance = Math.sqrt(distSq);
      const nx = dx / distance;
      const ny = dy / distance;

      pickup.position.x += nx * attractionSpeed;
      pickup.position.y += ny * attractionSpeed;

      if (distSq < pickupRadiusSq) {
        this.collectPickup(pickup);
      }
    }
  }

  private collectPickup(pickup: PickupInstance): void {
    pickup.isPickedUp = true;
    this.playerResources.addCurrency(pickup.currencyAmount);

    const index = this.pickups.indexOf(pickup);
    if (index !== -1) {
      this.pickups.splice(index, 1);
    }
  }
}
