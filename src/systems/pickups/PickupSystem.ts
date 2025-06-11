// src/systems/pickups/PickupSystem.ts

import { getPickupSprite } from '@/rendering/cache/PickupSpriteCache';
import { BLOCK_PICKUP_SPARK_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import { PlayerResources } from '@/game/player/PlayerResources';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';
import { ParticleManager } from '@/systems/fx/ParticleManager';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { getBlockSprite, DamageLevel } from '@/rendering/cache/BlockSpriteCache';
import { audioManager } from '@/audio/Audio';
import { createPointLight } from '@/lighting/lights/createPointLight';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { repairAllBlocksWithHealing } from '@/systems/pickups/helpers/repairAllBlocksWithHealing';

import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { ParticleOptions } from '@/systems/fx/ParticleManager';
import type { CanvasManager } from '@/core/CanvasManager';
import type { ScreenEffectsSystem } from '../fx/ScreenEffectsSystem';
import type { PopupMessageSystem } from '@/ui/PopupMessageSystem';
import type { Camera } from '@/core/Camera';
import type { PickupInstance } from '@/game/interfaces/entities/PickupInstance';
import type { Ship } from '@/game/ship/Ship';

const PICKUP_RADIUS = 16;
const PICKUP_RANGE_PER_HARVEST_UNIT = 48;
const ATTRACTION_SPEED = 10;
const PICKUP_ATTRACTION_EXPONENT = 2.0;
const CULL_PADDING = 128;
const ROTATION_SPEED = {
  currency: 0.1,
  blockUnlock: 0.05,
  repair: 0.1,
};

const SPARK_OPTIONS: ParticleOptions = {
  colors: ['#0022ff', '#000099', '#0055cc', '#003388'], // deeper blues
  baseSpeed: 50,
  sizeRange: [1, 2.5],   // further refined
  lifeRange: [1, 2],
  fadeOut: true,
};

export class PickupSystem {
  private ctx: CanvasRenderingContext2D;
  private pickups: PickupInstance[] = [];
  private playerResources: PlayerResources;
  private playerShip: Ship;
  private sparkManager: ParticleManager;
  private screenEffects: ScreenEffectsSystem;
  private popupMessageSystem: PopupMessageSystem;
  private shipBuilderEffects: ShipBuilderEffectsSystem;

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera,
    playerShip: Ship,
    sparkManager: ParticleManager,
    screenEffects: ScreenEffectsSystem,
    popupMessageSystem: PopupMessageSystem,
    shipBuilderEffects: ShipBuilderEffectsSystem
  ) {
    this.ctx = canvasManager.getContext('entities');
    this.playerResources = PlayerResources.getInstance();
    this.playerShip = playerShip;
    this.sparkManager = sparkManager
    this.screenEffects = screenEffects;
    this.popupMessageSystem = popupMessageSystem;
    this.shipBuilderEffects = shipBuilderEffects;
  }

  spawnCurrencyPickup(position: { x: number; y: number }, amount: number): void {
    const lightingOrchestrator = LightingOrchestrator.getInstance();

    const light = createPointLight({
      x: position.x,
      y: position.y,
      radius: 200, // ~2x BLOCK_SIZE visually
      color: '#00ccff', // cyan-blue glow
      intensity: 1.0,
      life: 10000,
      expires: true,
    });

    lightingOrchestrator.registerLight(light);

    const newPickup: PickupInstance = {
      type: {
        id: 'currency',
        name: 'Gold Coin',
        currencyAmount: amount,
        category: 'currency',
        sprite: 'currency',
        repairAmount: 0,
      },
      position,
      isPickedUp: false,
      repairAmount: 0,
      currencyAmount: amount,
      rotation: 0,
      lightId: light.id,
    };

    this.pickups.push(newPickup);
  }

  spawnRepairPickup(position: { x: number; y: number }, amount: number): void {
    const lightingOrchestrator = LightingOrchestrator.getInstance();

    const light = createPointLight({
      x: position.x,
      y: position.y,
      radius: 200,
      color: '#00ff88', // minty green glow
      intensity: 1.0,
      life: 10000,
      expires: true,
    });

    lightingOrchestrator.registerLight(light);

    const newPickup: PickupInstance = {
      type: {
        id: 'repair',
        name: 'Repair Nanobot Swarm',
        sprite: 'repair',
        category: 'repair',
        currencyAmount: 0,
        repairAmount: amount,
      },
      position,
      isPickedUp: false,
      currencyAmount: 0,
      repairAmount: amount,
      rotation: 0,
      lightId: light.id,
    };

    this.pickups.push(newPickup);
  }


  spawnBlockUnlockPickup(position: { x: number; y: number }, blockType: BlockType): void {
    const techManager = PlayerTechnologyManager.getInstance();

    // Prevent drop if already unlocked
    if (techManager.isUnlocked(blockType.id)) return;

    const newPickup: PickupInstance = {
      type: {
        id: `unlock-${blockType.id}`,
        name: `${blockType.name} Blueprint`,
        sprite: blockType.sprite,
        currencyAmount: 0,
        category: 'blockUnlock',
        blockTypeId: blockType.id,
        repairAmount: 0,
      },
      position,
      isPickedUp: false,
      repairAmount: 0,
      currencyAmount: 0,
      rotation: 0,
    };

    this.pickups.push(newPickup);
  }

  render(dt: number): void {
    const viewport = this.camera.getViewportBounds();
    const minX = viewport.x - CULL_PADDING;
    const minY = viewport.y - CULL_PADDING;
    const maxX = viewport.x + viewport.width + CULL_PADDING;
    const maxY = viewport.y + viewport.height + CULL_PADDING;

    for (const pickup of this.pickups) {
      const { x, y } = pickup.position;
      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      // === Resolve sprite ===
      let sprite;
      if (pickup.type.category === 'currency' || pickup.type.category === 'repair') {
        sprite = getPickupSprite(pickup.type.id);
      } else if (pickup.type.category === 'blockUnlock' && pickup.type.blockTypeId) {
        try {
          sprite = getBlockSprite(pickup.type.blockTypeId, DamageLevel.NONE);
        } catch (e) {
          console.error(`Failed to resolve block sprite for pickup: ${pickup.type.blockTypeId}`, e);
          continue;
        }
      }

      if (!sprite) {
        console.error('No sprite found for pickup type:', pickup.type.id);
        continue;
      }

      const screenPosition = this.camera.worldToScreen(x, y);
      pickup.rotation += ROTATION_SPEED[pickup.type.category] ?? 0.5;

      // === Compute visual scale ===
      let scale = this.camera.getZoom();

      if (pickup.type.category === 'currency') {
        const scaleFactor = Math.log2(pickup.currencyAmount + 1) / 5;
        scale *= (0.5 + scaleFactor);
      } else if (pickup.type.category === 'repair') {
        const scaleFactor = Math.log2(pickup.repairAmount + 1) / 5;
        scale *= (0.5 + scaleFactor);
      } else if (pickup.type.category === 'blockUnlock') {
        scale *= 2.0;
      }

      // === Draw the pickup sprite ===
      const drawSize = BLOCK_SIZE;
      this.ctx.save();
      this.ctx.translate(screenPosition.x, screenPosition.y);
      this.ctx.rotate(pickup.rotation);
      this.ctx.scale(scale, scale);
      this.ctx.drawImage(
        sprite.base,
        -drawSize / 2,
        -drawSize / 2,
        drawSize,
        drawSize
      );
      this.ctx.restore();

      // === Spark emission ===
      let sparkColors = SPARK_OPTIONS.colors;

      if (pickup.type.category === 'blockUnlock' && pickup.type.blockTypeId) {
        const match = pickup.type.blockTypeId.match(/(\d+)/);
        const tier = match ? parseInt(match[1], 10) : 0;
        sparkColors = BLOCK_PICKUP_SPARK_COLOR_PALETTES[tier] ?? SPARK_OPTIONS.colors;
      } else if (pickup.type.category === 'repair') {
        sparkColors = ['#22ff88', '#00cc66', '#33ffaa'];
      }

      this.sparkManager.emitContinuous(pickup.position, dt, 10, {
        ...SPARK_OPTIONS,
        colors: sparkColors,
      });
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

      if (pickup.lightId) {
        const lightingOrchestrator = LightingOrchestrator.getInstance();
        const light = lightingOrchestrator.getLightById?.(pickup.lightId);
        if (light && light.type === 'point') {
          light.x = pickup.position.x;
          light.y = pickup.position.y;
        }
      }

      if (distSq < pickupRadiusSq) {
        this.collectPickup(pickup);
      }
    }
  }

  private collectPickup(pickup: PickupInstance): void {
    pickup.isPickedUp = true;

    if (pickup.lightId) {
      const lightingOrchestrator = LightingOrchestrator.getInstance();
      lightingOrchestrator.removeLight(pickup.lightId);
    }

    const index = this.pickups.indexOf(pickup);
    if (index !== -1) {
      this.pickups.splice(index, 1);
    }

    if (pickup.type.category === 'currency') {
      const amount = pickup.currencyAmount;
      this.playerResources.addCurrency(amount);
      missionResultStore.addCurrency(amount);
      audioManager.play('assets/sounds/sfx/ship/gather_00.wav', 'sfx', { maxSimultaneous: 3 });

    } else if (pickup.type.category === 'blockUnlock' && pickup.type.blockTypeId) {
      const technologyManager = PlayerTechnologyManager.getInstance();
      technologyManager.unlock(pickup.type.blockTypeId);
      audioManager.play('assets/sounds/sfx/ui/start_00.wav', 'sfx', { maxSimultaneous: 2 });

      this.popupMessageSystem.displayMessage(`Block type ${pickup.type.blockTypeId} Unlocked!`, {
        color: '#66ff66',
        font: '28px monospace',
        glow: true,
      });

      // Trigger screen flash based on block tier
      const match = pickup.type.blockTypeId.match(/(\d+)/);
      const tier = match ? parseInt(match[1], 10) : 0;
      const palette = BLOCK_PICKUP_SPARK_COLOR_PALETTES[tier] ?? ['#fff'];
      const flashColor = palette[0];

      this.screenEffects.createFlash(flashColor, 0.4, 0.4);
    } else if (pickup.type.category === 'repair') {
      const amount = pickup.repairAmount;
      
      // TODO: Implement actual repair logic — heal damaged blocks etc.
      repairAllBlocksWithHealing(this.playerShip, amount, this.shipBuilderEffects);

      audioManager.play('assets/sounds/sfx/ship/repair_00.wav', 'sfx', { maxSimultaneous: 2 }); 
    } else {
      console.warn('Unhandled pickup category or missing data:', pickup);
    }
  }
}
