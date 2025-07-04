// src/systems/pickups/PickupSystem.ts

import { BLOCK_PICKUP_SPARK_COLOR_PALETTES, BLOCK_PICKUP_LIGHT_TIER_COLORS, PICKUP_FLASH_COLORS, BLOCK_TIER_COLORS } from '@/game/blocks/BlockColorSchemes';
import { BLOCK_SIZE } from '@/config/view';
import { PlayerResources } from '@/game/player/PlayerResources';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { getTier1BlockIfTier0, getTierFromBlockId } from './helpers/getTierFromBlockId';
import { ParticleManager } from '@/systems/fx/ParticleManager';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { DamageLevel } from '@/rendering/cache/BlockSpriteCache';
import { audioManager } from '@/audio/Audio';
import { createPointLight } from '@/lighting/lights/createPointLight';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { repairAllBlocksWithHealing } from '@/systems/pickups/helpers/repairAllBlocksWithHealing';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { shakeCamera } from '@/core/interfaces/events/CameraReporter';
import { reportPickupCollected } from '@/core/interfaces/events/PickupSpawnReporter';
import { PlayerExperienceManager } from '@/game/player/PlayerExperienceManager';
import { GlobalSpriteRequestBus } from '@/rendering/unified/bus/SpriteRenderRequestBus';
import { getGLPickupSprite } from '@/rendering/cache/PickupSpriteCache';
import { getGL2BlockSprite } from '@/rendering/cache/BlockSpriteCache';

import type { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import type { BlockType } from '@/game/interfaces/types/BlockType';
import type { BlockDropDecisionMenu } from '@/ui/menus/BlockDropDecisionMenu';
import type { ParticleOptions } from '@/systems/fx/ParticleManager';
import type { ScreenEffectsSystem } from '../fx/ScreenEffectsSystem';
import type { PopupMessageSystem } from '@/ui/PopupMessageSystem';
import type { Camera } from '@/core/Camera';
import type { PickupInstance } from '@/game/interfaces/entities/PickupInstance';
import type { Ship } from '@/game/ship/Ship';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';


const BASE_PICKUP_SCALE = 0.5;
const BASE_BLOCK_PICKUP_SCALE = 2.0

const PICKUP_RADIUS = 16;
const PICKUP_RANGE_PER_HARVEST_UNIT = 48;
const ATTRACTION_SPEED = 10;
const PICKUP_ATTRACTION_EXPONENT = 2.0;
const ROTATION_SPEED = {
  currency: 1,
  block: 1,
  repair: 1,
  quantumAttractor: 4,
  shipBlueprint: 4,
};

const CULL_PADDING = 0;

const SPARK_OPTIONS: ParticleOptions = {
  colors: ['#ffcc00', '#ffaa00', '#ff8800', '#cc6600'],
  baseSpeed: 50,
  sizeRange: [1, 2.5],   // further refined
  lifeRange: [1, 2],
  fadeOut: true,
};

export class PickupSystem {
  private pickups: PickupInstance[] = [];
  private blockPickups: PickupInstance[] = [];
  private resourcePickups: PickupInstance[] = [];

  private playerResources: PlayerResources;
  private playerShip: Ship | null = null;
  private sparkManager: ParticleManager;
  private screenEffects: ScreenEffectsSystem;
  private popupMessageSystem: PopupMessageSystem;
  private shipBuilderEffects: ShipBuilderEffectsSystem;
  private blockDropDecisionMenu: BlockDropDecisionMenu;

  // === Pitch progression tuning ===
  private static readonly BASE_PICKUP_PITCH = 0.8;
  private static readonly PICKUP_PITCH_INCREMENT = 0.05;
  private static readonly MAX_PICKUP_PITCH = 2.2;
  private static readonly PITCH_RESET_DELAY = 3.2; // seconds

  private static readonly QUANTUM_ATTRACTOR_DURATION = 6.0;
  private static readonly QUANTUM_ATTRACTOR_RANGE_BOOST = 36000;
  private static readonly QUANTUM_ATTRACTOR_SPEED_MULTIPLIER = 5.0;
  private quantumAttractorRemainingTime = 0;

  private currencyPickupPitch: number = PickupSystem.BASE_PICKUP_PITCH;
  private blockPickupPitch: number = PickupSystem.BASE_PICKUP_PITCH;
  private timeSinceLastCurrencyPickup: number = 0;
  private timeSinceLastBlockPickup: number = 0;

  private destroyed = false;

  constructor(
    private readonly camera: Camera,
    sparkManager: ParticleManager,
    screenEffects: ScreenEffectsSystem,
    popupMessageSystem: PopupMessageSystem,
    shipBuilderEffects: ShipBuilderEffectsSystem,
    blockDropDecisionMenu: BlockDropDecisionMenu
  ) {
    this.playerResources = PlayerResources.getInstance();
    this.sparkManager = sparkManager
    this.screenEffects = screenEffects;
    this.popupMessageSystem = popupMessageSystem;
    this.shipBuilderEffects = shipBuilderEffects;
    this.blockDropDecisionMenu = blockDropDecisionMenu;
  }

  setPlayerShip(ship: Ship): void {
    this.playerShip = ship;
  }

  spawnCurrencyPickup(position: { x: number; y: number }, amount: number): void {
    const lightingOrchestrator = LightingOrchestrator.getInstance();

    const light = createPointLight({
      x: position.x,
      y: position.y,
      radius: 200, // ~2x BLOCK_SIZE visually
      color: '#ffcc00', // gold glow
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
      spawnTime: performance.now() / 1000,
      ttl: 90,
    };

    this.pickups.push(newPickup);
    this.resourcePickups.push(newPickup);
  }

  spawnRepairPickup(position: { x: number; y: number }, amount: number): void {
    const lightingOrchestrator = LightingOrchestrator.getInstance();

    const light = createPointLight({
      x: position.x,
      y: position.y,
      radius: 200,
      color: '#ff4444', // soft red glow
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
      spawnTime: performance.now() / 1000,
      ttl: 30,
    };

    this.pickups.push(newPickup);
    this.resourcePickups.push(newPickup);
  }

  spawnBlockPickup(position: { x: number; y: number }, blockType: BlockType): void {
    const lightingOrchestrator = LightingOrchestrator.getInstance();
    const tier = getTierFromBlockId(blockType.id);
    const color = BLOCK_PICKUP_LIGHT_TIER_COLORS[tier] ?? '#ffffff'; // fallback to white

    const light = createPointLight({
      x: position.x,
      y: position.y,
      radius: 300,
      color,
      intensity: 0.75,
      life: 10000,
      expires: true,
    });

    lightingOrchestrator.registerLight(light);

    const blockDropOverride = blockType.blockDropOverride;
    if (blockDropOverride) {
      blockType = getBlockType(blockDropOverride)!;
    }

    const newPickup: PickupInstance = {
      type: {
        id: `unlock-${blockType.id}`,
        name: `${blockType.name} Blueprint`,
        sprite: blockType.sprite,
        currencyAmount: 0,
        category: 'block',
        blockTypeId: blockType.id,
        repairAmount: 0,
      },
      position,
      isPickedUp: false,
      repairAmount: 0,
      currencyAmount: 0,
      rotation: 0,
      lightId: light.id,
      spawnTime: performance.now() / 1000,
      ttl: 30,
    };

    this.pickups.push(newPickup);
    this.blockPickups.push(newPickup);
  }

  spawnQuantumAttractorPickup(position: { x: number; y: number }): void {
    const lightingOrchestrator = LightingOrchestrator.getInstance();

    const light = createPointLight({
      x: position.x,
      y: position.y,
      radius: 380,
      color: '#00ffff', // cyan-blue glow to match "quantum" tone
      intensity: 1.6,
      life: 10000,
      expires: true,
    });

    lightingOrchestrator.registerLight(light);

    const newPickup: PickupInstance = {
      type: {
        id: 'quantumAttractor',
        name: 'Quantum Attractor',
        sprite: 'quantumAttractor',
        category: 'quantumAttractor',
        currencyAmount: 0,
        repairAmount: 0,
      },
      position,
      isPickedUp: false,
      repairAmount: 0,
      currencyAmount: 0,
      rotation: 0,
      lightId: light.id,
      spawnTime: performance.now() / 1000,
      ttl: 999,
    };

    this.pickups.push(newPickup);
    this.resourcePickups.push(newPickup);
  }

  spawnShipBlueprintPickup(position: { x: number; y: number }, shipId: string): void {
    const lightingOrchestrator = LightingOrchestrator.getInstance();

    const light = createPointLight({
      x: position.x,
      y: position.y,
      radius: 500,
      color: '#00FFFF', // cyan-blue glow
      intensity: 1.4,
      life: 10000,
      expires: true,
    });

    lightingOrchestrator.registerLight(light);

    const newPickup: PickupInstance = {
      type: {
        id: `shipBlueprint`,
        name: `${shipId} Blueprint`,
        sprite: 'shipBlueprint',
        category: 'shipBlueprint',
        currencyAmount: 0,
        repairAmount: 0,
      },
      position,
      isPickedUp: false,
      repairAmount: 0,
      currencyAmount: 0,
      rotation: 0,
      lightId: light.id,
      spawnTime: performance.now() / 1000,
      ttl: 999,
      shipId,
    };

    this.pickups.push(newPickup);
    this.resourcePickups.push(newPickup);
  }

  private isQuantumAttractorActive(): boolean {
    return this.quantumAttractorRemainingTime > 0;
  }

  private activateQuantumAttractor(): void {
    this.quantumAttractorRemainingTime = PickupSystem.QUANTUM_ATTRACTOR_DURATION;

    shakeCamera(10, 3, 10);
    audioManager.play('assets/sounds/sfx/magic/activate.wav', 'sfx', {
      volume: 1.0,
      pitch: 1.0,
      maxSimultaneous: 1,
    });
  }

  render(dt: number): void {}

  update(dt: number): void {
    if (this.destroyed || !this.playerShip) return;

    this.timeSinceLastCurrencyPickup += dt;
    this.timeSinceLastBlockPickup += dt;

    if (this.timeSinceLastCurrencyPickup >= PickupSystem.PITCH_RESET_DELAY) {
      this.currencyPickupPitch = PickupSystem.BASE_PICKUP_PITCH;
    }
    if (this.timeSinceLastBlockPickup >= PickupSystem.PITCH_RESET_DELAY) {
      this.blockPickupPitch = PickupSystem.BASE_PICKUP_PITCH;
    }

    const shipPosition = this.playerShip.getTransform().position;
    const baseAttractionRange = 600;
    const bonusRange = this.playerShip.getTotalHarvestRate() * PICKUP_RANGE_PER_HARVEST_UNIT;
    let attractionRange = baseAttractionRange + bonusRange;
    let attractionSpeedBoost = 1.0;

    if (this.quantumAttractorRemainingTime > 0) {
      this.quantumAttractorRemainingTime -= dt;
      attractionRange += PickupSystem.QUANTUM_ATTRACTOR_RANGE_BOOST;
      attractionSpeedBoost = PickupSystem.QUANTUM_ATTRACTOR_SPEED_MULTIPLIER;
      if (this.quantumAttractorRemainingTime <= 0) {
        this.quantumAttractorRemainingTime = 0;
      }
    }

    const attractionRangeSq = attractionRange * attractionRange;
    const pickupRadiusSq = PICKUP_RADIUS * PICKUP_RADIUS;

    const viewport = this.camera.getViewportBounds();
    const minX = viewport.x - CULL_PADDING;
    const minY = viewport.y - CULL_PADDING;
    const maxX = viewport.x + viewport.width + CULL_PADDING;
    const maxY = viewport.y + viewport.height + CULL_PADDING;

    const now = performance.now() / 1000;
    const shouldCull = !this.isQuantumAttractorActive();

    const emissionChance = Math.min(0.2, 30 / this.pickups.length); // 60 emissions per frame on average
    const emitParticles = Math.random() < emissionChance;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      if (pickup.isPickedUp) continue;

      // === TTL Expiry Check ===
      if (pickup.ttl !== undefined && now - pickup.spawnTime >= pickup.ttl) {
        if (pickup.lightId) {
          LightingOrchestrator.getInstance().removeLight(pickup.lightId);
        }

        this.pickups.splice(i, 1);
        this.blockPickups = this.blockPickups.filter(p => p !== pickup);
        this.resourcePickups = this.resourcePickups.filter(p => p !== pickup);
        continue;
      }

      const px = pickup.position.x;
      const py = pickup.position.y;
      
      if (shouldCull) {
        if (px < minX || px > maxX || py < minY || py > maxY) continue;
      }

      pickup.rotation += (ROTATION_SPEED[pickup.type.category] ?? 0) * dt;

      // Only emit particles for the first 60 pickups
      if (emitParticles) {
        let sparkColors: string[];
        switch (pickup.type.category) {
          case 'block': {
            const blockTypeId = pickup.type.blockTypeId;
            if (blockTypeId) {
              const tier = getTierFromBlockId(blockTypeId);
              sparkColors = BLOCK_PICKUP_SPARK_COLOR_PALETTES[tier] ?? SPARK_OPTIONS.colors;
            } else {
              sparkColors = ['#00ffff'];
            }
            break;
          }
          case 'repair':
            sparkColors = ['#ff4444', '#cc2222', '#ff0000', '#aa0000'];
            break;
          case 'currency':
          default:
            sparkColors = ['#ffcc00', '#ffaa00', '#ff8800', '#cc6600'];
            break;
        }

        this.sparkManager.emitParticle(pickup.position, {
          colors: sparkColors,
          baseSpeed: 250,
          sizeRange: [1, 2.5],
          lifeRange: [1, 2],
          fadeOut: true,
        });
      }

      const dx = shipPosition.x - pickup.position.x;
      const dy = shipPosition.y - pickup.position.y;
      const distSq = dx * dx + dy * dy;

      const textureEntry = (() => {
        switch (pickup.type.category) {
          case 'currency':
          case 'quantumAttractor':
          case 'shipBlueprint':
          case 'repair':
            try {
              return getGLPickupSprite(pickup.type.id).texture;
            } catch (e) {
              console.error(`[PickupSystem] Missing GL sprite for pickup: ${pickup.type.id}`, e);
              return null;
            }

          case 'block':
            try {
              const blockType = getBlockType(pickup.type.blockTypeId!);
              if (!blockType) return null;
              const sprite = getGL2BlockSprite(blockType, DamageLevel.NONE);
              return sprite?.base ?? null;
            } catch (e) {
              console.error(`[PickupSystem] Failed to load block sprite for pickup: ${pickup.type.blockTypeId}`, e);
              return null;
            }

          default:
            console.warn(`[PickupSystem] Unhandled pickup category: ${pickup.type.category}`);
            return null;
        }
      })();

      if (textureEntry) {
        let alpha = 1.0;
        let width = BLOCK_SIZE;
        let height = BLOCK_SIZE;

        if (pickup.type.category === 'currency') {
          const scale = BASE_PICKUP_SCALE + Math.log2(pickup.currencyAmount + 1) / 5;
          width *= scale;
          height *= scale;
        } else if (pickup.type.category === 'repair') {
          const scale = BASE_PICKUP_SCALE + Math.log2(pickup.repairAmount + 1) / 5;
          width *= scale;
          height *= scale;
        } else if (pickup.type.category === 'block') {
          width *= BASE_BLOCK_PICKUP_SCALE;
          height *= BASE_BLOCK_PICKUP_SCALE;
        } else if (pickup.type.category === 'quantumAttractor') {
          width = 176;
          height = 176;
        } else if (pickup.type.category === 'shipBlueprint') {
          width = 176;
          height = 176;
        }

        GlobalSpriteRequestBus.add({
          texture: textureEntry,
          worldX: pickup.position.x,
          worldY: pickup.position.y,
          widthPx: width,
          heightPx: height,
          alpha: alpha,
          rotation: pickup.rotation,
        });
      }

      if (distSq > attractionRangeSq) continue;

      // If the pickup is a block
      if (pickup.type.category === 'block') {
        const playerResources = PlayerResources.getInstance();
        const maxQueueSize = playerResources.getMaxBlockQueueSize();
        const currentQueueSize = playerResources.getBlockCount();

        if (currentQueueSize >= maxQueueSize) continue;
      }

      const normalizedDistanceSq = distSq / attractionRangeSq;
      const attractionMultiplier = Math.pow(1 - normalizedDistanceSq, PICKUP_ATTRACTION_EXPONENT);
      const attractionSpeed = ATTRACTION_SPEED * attractionMultiplier * attractionSpeedBoost;

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

  private async collectPickup(pickup: PickupInstance): Promise<void> {
    if (!this.playerShip) return;

    pickup.isPickedUp = true;

    // === Remove associated light if it exists ===
    if (pickup.lightId) {
      const lightingOrchestrator = LightingOrchestrator.getInstance();
      lightingOrchestrator.removeLight(pickup.lightId);
    }

    // === Remove from all relevant arrays ===
    const removeFrom = (list: PickupInstance[]) => {
      const idx = list.indexOf(pickup);
      if (idx !== -1) list.splice(idx, 1);
    };

    removeFrom(this.pickups);

    if (pickup.type.category === 'block') {
      removeFrom(this.blockPickups);
    } else {
      removeFrom(this.resourcePickups);
    }

    // Pickup Flash
    const playerPos = this.playerShip.getTransform().position;
    const lightingOrchestrator = LightingOrchestrator.getInstance();

    let flashColor = PICKUP_FLASH_COLORS[pickup.type.category] ?? '#ffffff';

    if (pickup.type.category === 'block' && pickup.type.blockTypeId) {
      const tier = getTierFromBlockId(pickup.type.blockTypeId);
      flashColor = BLOCK_PICKUP_LIGHT_TIER_COLORS[tier] ?? flashColor;
    }

    const pickupFlash = createPointLight({
      x: playerPos.x,
      y: playerPos.y,
      radius: 320 + Math.random() * 100,
      color: flashColor,
      intensity: 1.2,
      life: 0.5, // short flash (in ms if you're using ms convention)
      expires: true,
    });

    lightingOrchestrator.registerLight(pickupFlash);
    let playedSound = false;

    // === Handle pickup effects by category ===
    if (pickup.type.category === 'currency') {
      const amount = pickup.currencyAmount;
      PlayerExperienceManager.getInstance().addEntropium(amount);
      missionResultStore.addEntropium(amount);

      playedSound = await audioManager.play('assets/sounds/sfx/ship/gather_00.wav', 'sfx', {
        volume: 1.25,
        pitch: this.currencyPickupPitch + 0.25,
        maxSimultaneous: 8,
      });
      if (playedSound) {
        this.timeSinceLastCurrencyPickup = 0;

        this.currencyPickupPitch = Math.min(
          this.currencyPickupPitch + PickupSystem.PICKUP_PITCH_INCREMENT,
          PickupSystem.MAX_PICKUP_PITCH
        );
      }
    } else if (pickup.type.category === 'block' && pickup.type.blockTypeId) {
      // Increment mission results
      missionResultStore.incrementBlockCollectedCount();

      playedSound = await audioManager.play('assets/sounds/sfx/ui/start_00.wav', 'sfx', {
        volume: 0.8,
        pitch: this.blockPickupPitch,
        maxSimultaneous: 8,
      });
      if (playedSound) {
        this.timeSinceLastBlockPickup = 0;
        this.blockPickupPitch = Math.min(
          this.blockPickupPitch + PickupSystem.PICKUP_PITCH_INCREMENT,
          PickupSystem.MAX_PICKUP_PITCH
        );
      }

      // Flash ship based on block tier
      const tier = getTierFromBlockId(pickup.type.blockTypeId);
      const flashColor = BLOCK_TIER_COLORS[tier] ?? ['#fff'];
      createLightFlash(playerPos.x, playerPos.y, 360, 1.0, 0.5, flashColor);

      // Enqueue into drop decision menu
      const blockType = getBlockType(pickup.type.blockTypeId)!;
      this.blockDropDecisionMenu.enqueueBlock(getTier1BlockIfTier0(blockType));

    } else if (pickup.type.category === 'repair') {
      const amount = pickup.repairAmount;
      repairAllBlocksWithHealing(this.playerShip, amount, this.shipBuilderEffects);

      audioManager.play('assets/sounds/sfx/ship/repair_00.wav', 'sfx', {
        maxSimultaneous: 3,
      });
    } else if (pickup.type.id === 'quantumAttractor') {
      reportPickupCollected('quantumAttractor');
      createLightFlash(playerPos.x, playerPos.y, 900, 1.0, 0.5, '#EFBF04');
      this.activateQuantumAttractor();
    } else if (pickup.type.category === 'shipBlueprint') {
      // Need pickup logic here
      if (!pickup.shipId) {
        console.warn('Ship blueprint pickup missing ship ID:', pickup);
        return;
      }
      const shipCollection = PlayerShipCollection.getInstance();

      // If we already have this ship unlocked
      if (shipCollection.isUnlocked(pickup.shipId)) {
        audioManager.play('assets/sounds/sfx/ship/gather_00.wav', 'sfx', { maxSimultaneous: 8, });
        this.popupMessageSystem.displayMessage(`${pickup.shipId} already Unlocked`, {
          color: '#00FFFF',
          duration: 5,
          font: '28px monospace',
          glow: true,
        });
      } else {
        missionResultStore.addShipDiscovery(pickup.shipId);
        shipCollection.discover(pickup.shipId);
        shipCollection.unlock(pickup.shipId);

        audioManager.play('assets/sounds/sfx/magic/collect_ship.wav', 'sfx', { maxSimultaneous: 8, });

        // Popup message here
        this.popupMessageSystem.displayMessage(`${pickup.shipId} Blueprint Discovered!`, {
          color: '#00FFFF',
          duration: 5,
          font: '28px monospace',
          glow: true,
        });
      }
      createLightFlash(playerPos.x, playerPos.y, 900, 1.0, 0.5, '#00FFFF');
    } else {
      console.warn('Unhandled pickup category or malformed pickup:', pickup);
    }
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    const lighting = LightingOrchestrator.getInstance();

    for (const pickup of this.pickups) {
      if (pickup.lightId) {
        lighting.removeLight(pickup.lightId);
      }
    }

    // Clear all arrays and nullify references
    this.pickups.length = 0;
    this.blockPickups.length = 0;
    this.resourcePickups.length = 0;

    this.playerShip = null;
  }
}
