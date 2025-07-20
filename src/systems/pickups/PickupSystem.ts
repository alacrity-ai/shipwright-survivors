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
import type { Ship } from '@/game/ship/Ship';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';

const BASE_PICKUP_SCALE = 0.5;
const BASE_BLOCK_PICKUP_SCALE = 2.0;

const PICKUP_RADIUS = 16;
const PICKUP_RANGE_PER_HARVEST_UNIT = 48;
const ATTRACTION_SPEED = 10;
const PICKUP_ATTRACTION_EXPONENT = 2.0;
const ROTATION_SPEED_ARRAY = [
  1, // Currency
  1, // Repair
  1, // Block
  4, // Quantum
  4, // ShipBlueprint
];
const CULL_PADDING = 0;

const SPARK_OPTIONS: ParticleOptions = {
  colors: ['#ffcc00', '#ffaa00', '#ff8800', '#cc6600'],
  baseSpeed: 50,
  sizeRange: [1, 2.5],
  lifeRange: [1, 2],
  fadeOut: true,
};

const REUSABLE_PARTICLE_OPTIONS: ParticleOptions = {
  colors: SPARK_OPTIONS.colors,
  baseSpeed: 250,
  sizeRange: [1, 2.5],  // reused, not recreated
  lifeRange: [1, 2],    // reused, not recreated
  fadeOut: true,
};

interface PickupSOA {
  count: number;

  x: Float32Array;
  y: Float32Array;
  rotation: Float32Array;
  ttl: Float32Array;
  spawnTime: Float32Array;
  category: Uint8Array;          // 0=currency,1=repair,2=block,3=quantum,4=shipBlueprint
  amount: Float32Array;          // currency or repair amount
  blockTypeId: (string | undefined)[];  // String block IDs
  texture: (WebGLTexture | null)[];
  shipId: (string | undefined)[];
  lightId: (number | null)[];
}

const MAX_PICKUPS = 3200; // Adjust based on game scale

function createPickupBuffer(max: number): PickupSOA {
  return {
    count: 0,
    x: new Float32Array(max),
    y: new Float32Array(max),
    rotation: new Float32Array(max),
    ttl: new Float32Array(max),
    spawnTime: new Float32Array(max),
    category: new Uint8Array(max),
    amount: new Float32Array(max),

    // String-based fields (parallel arrays)
    blockTypeId: new Array<string | undefined>(max),
    shipId: new Array<string | undefined>(max),

    // Non-numeric (object) fields
    texture: new Array<WebGLTexture | null>(max),
    lightId: new Array<number | null>(max),
  };
}

// Category enum for consistency
const enum PickupCategory {
  Currency = 0,
  Repair = 1,
  Block = 2,
  Quantum = 3,
  ShipBlueprint = 4,
}

export class PickupSystem {
  private readonly soa: PickupSOA;
  private readonly freeIndices: number[] = []; // reuse slots on removal

  private playerResources: PlayerResources;
  private playerShip: Ship | null = null;
  private lightingOrchestrator: LightingOrchestrator;

  private destroyed = false;

  private blockSpriteCache = new Map<string, WebGLTexture | null>();
  private readonly tempVec = { x: 0, y: 0 };

  private static readonly BASE_PICKUP_PITCH = 0.8;
  private static readonly PICKUP_PITCH_INCREMENT = 0.05;
  private static readonly MAX_PICKUP_PITCH = 2.2;
  private static readonly PITCH_RESET_DELAY = 3.2;

  private static readonly QUANTUM_ATTRACTOR_DURATION = 8.0;
  private static readonly QUANTUM_ATTRACTOR_RANGE_BOOST = 64000;
  private static readonly QUANTUM_ATTRACTOR_SPEED_MULTIPLIER = 6.0;

  // Audio pitch state
  private currencyPickupPitch = PickupSystem.BASE_PICKUP_PITCH;
  private blockPickupPitch = PickupSystem.BASE_PICKUP_PITCH;
  private timeSinceLastCurrencyPickup = 0;
  private timeSinceLastBlockPickup = 0;

  private quantumAttractorRemainingTime = 0;

  constructor(
    private readonly camera: Camera,
    private readonly sparkManager: ParticleManager,
    private readonly screenEffects: ScreenEffectsSystem,
    private readonly popupMessageSystem: PopupMessageSystem,
    private readonly shipBuilderEffects: ShipBuilderEffectsSystem,
    private readonly blockDropDecisionMenu: BlockDropDecisionMenu
  ) {
    this.playerResources = PlayerResources.getInstance();
    this.soa = createPickupBuffer(MAX_PICKUPS);
    this.lightingOrchestrator = LightingOrchestrator.getInstance();
  }

  setPlayerShip(ship: Ship): void {
    this.playerShip = ship;
  }

  // Allocation helper: reuses or expands index space
  private allocateIndex(): number {
    if (this.freeIndices.length > 0) {
      const idx = this.freeIndices.pop()!;
      if (idx >= this.soa.count) this.soa.count = idx + 1;
      return idx;
    }
    if (this.soa.count >= MAX_PICKUPS) return -1;
    return this.soa.count++;
  }

  // Recycle helper: swap-with-last for O(1) removal
  private recycleIndex(i: number): void {
    const last = this.soa.count - 1;

    // Clean up any light
    if (this.soa.lightId[i]) {
      this.lightingOrchestrator.removeLight(this.soa.lightId[i]!);
      this.soa.lightId[i] = null;
    }

    if (i !== last) this.swap(i, last);
    this.freeIndices.push(last);
    this.soa.count--;
  }

  private swap(i: number, j: number): void {
    let t: number;

    // Swap all numeric/typed-array fields
    t = this.soa.x[i]; this.soa.x[i] = this.soa.x[j]; this.soa.x[j] = t;
    t = this.soa.y[i]; this.soa.y[i] = this.soa.y[j]; this.soa.y[j] = t;
    t = this.soa.rotation[i]; this.soa.rotation[i] = this.soa.rotation[j]; this.soa.rotation[j] = t;
    t = this.soa.ttl[i]; this.soa.ttl[i] = this.soa.ttl[j]; this.soa.ttl[j] = t;
    t = this.soa.spawnTime[i]; this.soa.spawnTime[i] = this.soa.spawnTime[j]; this.soa.spawnTime[j] = t;
    t = this.soa.amount[i]; this.soa.amount[i] = this.soa.amount[j]; this.soa.amount[j] = t;

    const cat = this.soa.category[i];
    this.soa.category[i] = this.soa.category[j];
    this.soa.category[j] = cat;

    // Swap string/object fields (reference swaps)
    const blockId = this.soa.blockTypeId[i];
    this.soa.blockTypeId[i] = this.soa.blockTypeId[j];
    this.soa.blockTypeId[j] = blockId;

    const tex = this.soa.texture[i];
    this.soa.texture[i] = this.soa.texture[j];
    this.soa.texture[j] = tex;

    const sid = this.soa.shipId[i];
    this.soa.shipId[i] = this.soa.shipId[j];
    this.soa.shipId[j] = sid;

    const lid = this.soa.lightId[i];
    this.soa.lightId[i] = this.soa.lightId[j];
    this.soa.lightId[j] = lid;
  }

  private resolvePickupTextureSOA(i: number): WebGLTexture | null {
    try {
      const cat = this.soa.category[i];

      switch (cat) {
        case PickupCategory.Currency:
          return getGLPickupSprite('currency').texture;

        case PickupCategory.Repair:
          return getGLPickupSprite('repair').texture;

        case PickupCategory.Quantum:
          return getGLPickupSprite('quantumAttractor').texture;

        case PickupCategory.ShipBlueprint:
          return getGLPickupSprite('shipBlueprint').texture;

        case PickupCategory.Block: {
          const id = this.soa.blockTypeId[i];
          if (!id) return null;

          if (this.blockSpriteCache.has(id)) {
            return this.blockSpriteCache.get(id)!;
          }

          const blockType = getBlockType(id);
          if (!blockType) {
            this.blockSpriteCache.set(id, null);
            return null;
          }

          const tex = getGL2BlockSprite(blockType, DamageLevel.NONE)?.base ?? null;
          this.blockSpriteCache.set(id, tex);
          return tex;
        }

        default:
          console.warn(`[PickupSystem] Unhandled pickup category index: ${cat}`);
          return null;
      }
    } catch (e) {
      console.error(`[PickupSystem] Failed to resolve texture for pickup at index ${i}`, e);
      return null;
    }
  }

  private computeAttractionSOA(
    i: number,
    shipX: number,
    shipY: number,
    attractionSpeedBoost: number,
    attractionRangeSq: number
  ): boolean {
    const dx = shipX - this.soa.x[i];
    const dy = shipY - this.soa.y[i];
    const distSq = dx * dx + dy * dy;

    if (distSq > attractionRangeSq) return false;

    const normalizedDistanceSq = distSq / attractionRangeSq;
    const attractionMultiplier = (1 - normalizedDistanceSq) ** PICKUP_ATTRACTION_EXPONENT;
    const speed = ATTRACTION_SPEED * attractionMultiplier * attractionSpeedBoost;

    const invLen = 1.0 / Math.sqrt(distSq);
    const nx = dx * invLen;
    const ny = dy * invLen;

    this.soa.x[i] += nx * speed;
    this.soa.y[i] += ny * speed;

    const lightId = this.soa.lightId[i];
    if (lightId) {
      this.lightingOrchestrator.updateLight(lightId, {
        x: this.soa.x[i],
        y: this.soa.y[i],
      });
    }

    return distSq < PICKUP_RADIUS * PICKUP_RADIUS;
  }

  public spawnCurrencyPickup(position: { x: number; y: number }, amount: number): void {
    const idx = this.allocateIndex();
    if (idx === -1) return;

    const now = performance.now() / 1000;

    const lightId = createPointLight({
      x: position.x,
      y: position.y,
      radius: 200,
      color: '#ffcc00',
      intensity: 0.7,
      life: 10000,
      expires: true,
    });

    this.soa.x[idx] = position.x;
    this.soa.y[idx] = position.y;
    this.soa.rotation[idx] = 0;
    this.soa.ttl[idx] = 90;
    this.soa.spawnTime[idx] = now;
    this.soa.category[idx] = PickupCategory.Currency;
    this.soa.amount[idx] = amount;
    this.soa.blockTypeId[idx] = undefined;
    this.soa.shipId[idx] = undefined;
    this.soa.lightId[idx] = lightId;
    this.soa.texture[idx] = getGLPickupSprite('currency').texture;
  }

  public spawnRepairPickup(position: { x: number; y: number }, amount: number): void {
    const idx = this.allocateIndex();
    if (idx === -1) return;

    const now = performance.now() / 1000;

    const lightId = createPointLight({
      x: position.x,
      y: position.y,
      radius: 200,
      color: '#ff4444',
      intensity: 1.0,
      life: 10000,
      expires: true,
    });

    this.soa.x[idx] = position.x;
    this.soa.y[idx] = position.y;
    this.soa.rotation[idx] = 0;
    this.soa.ttl[idx] = 30;
    this.soa.spawnTime[idx] = now;
    this.soa.category[idx] = PickupCategory.Repair;
    this.soa.amount[idx] = amount;
    this.soa.blockTypeId[idx] = undefined;
    this.soa.shipId[idx] = undefined;
    this.soa.lightId[idx] = lightId;
    this.soa.texture[idx] = getGLPickupSprite('repair').texture;
  }

  public spawnBlockPickup(position: { x: number; y: number }, blockType: BlockType): void {
    const idx = this.allocateIndex();
    if (idx === -1) return;

    const now = performance.now() / 1000;

    const tier = getTierFromBlockId(blockType.id);
    const color = BLOCK_PICKUP_LIGHT_TIER_COLORS[tier] ?? '#ffffff';

    const lightId = createPointLight({
      x: position.x,
      y: position.y,
      radius: 300,
      color,
      intensity: 0.75,
      life: 10000,
      expires: true,
    });

    // Handle drop override (mutates blockType if needed)
    const finalBlockType = blockType.blockDropOverride ? getBlockType(blockType.blockDropOverride)! : blockType;

    this.soa.x[idx] = position.x;
    this.soa.y[idx] = position.y;
    this.soa.rotation[idx] = 0;
    this.soa.ttl[idx] = 30;
    this.soa.spawnTime[idx] = now;
    this.soa.category[idx] = PickupCategory.Block;
    this.soa.amount[idx] = 0;
    this.soa.blockTypeId[idx] = finalBlockType.id;
    this.soa.shipId[idx] = undefined;
    this.soa.lightId[idx] = lightId;

    // Cache block texture (resolve only once)
    const tex = getGL2BlockSprite(finalBlockType, DamageLevel.NONE)?.base ?? null;
    this.blockSpriteCache.set(finalBlockType.id, tex);
    this.soa.texture[idx] = tex;
  }

  public spawnQuantumAttractorPickup(position: { x: number; y: number }): void {
    const idx = this.allocateIndex();
    if (idx === -1) return;

    const now = performance.now() / 1000;

    const lightId = createPointLight({
      x: position.x,
      y: position.y,
      radius: 380,
      color: '#00ffff',
      intensity: 1.6,
      life: 10000,
      expires: true,
    });

    this.soa.x[idx] = position.x;
    this.soa.y[idx] = position.y;
    this.soa.rotation[idx] = 0;
    this.soa.ttl[idx] = 999;
    this.soa.spawnTime[idx] = now;
    this.soa.category[idx] = PickupCategory.Quantum;
    this.soa.amount[idx] = 0;
    this.soa.blockTypeId[idx] = undefined;
    this.soa.shipId[idx] = undefined;
    this.soa.lightId[idx] = lightId;
    this.soa.texture[idx] = getGLPickupSprite('quantumAttractor').texture;
  }

  public spawnShipBlueprintPickup(position: { x: number; y: number }, shipId: string): void {
    const idx = this.allocateIndex();
    if (idx === -1) return;

    const now = performance.now() / 1000;

    const lightId = createPointLight({
      x: position.x,
      y: position.y,
      radius: 500,
      color: '#00ffff',
      intensity: 1.4,
      life: 10000,
      expires: true,
    });

    this.soa.x[idx] = position.x;
    this.soa.y[idx] = position.y;
    this.soa.rotation[idx] = 0;
    this.soa.ttl[idx] = 999;
    this.soa.spawnTime[idx] = now;
    this.soa.category[idx] = PickupCategory.ShipBlueprint;
    this.soa.amount[idx] = 0;
    this.soa.blockTypeId[idx] = undefined;
    this.soa.shipId[idx] = shipId;
    this.soa.lightId[idx] = lightId;
    this.soa.texture[idx] = getGLPickupSprite('shipBlueprint').texture;
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

    const shipPos = this.playerShip.getTransform().position;
    const baseRange = 700;
    const bonusRange = this.playerShip.getTotalHarvestRate() * PICKUP_RANGE_PER_HARVEST_UNIT;
    let attractionRange = baseRange + bonusRange;
    let speedBoost = 1.0;

    if (this.quantumAttractorRemainingTime > 0) {
      this.quantumAttractorRemainingTime -= dt;
      attractionRange += PickupSystem.QUANTUM_ATTRACTOR_RANGE_BOOST;
      speedBoost = PickupSystem.QUANTUM_ATTRACTOR_SPEED_MULTIPLIER;
      if (this.quantumAttractorRemainingTime <= 0) {
        this.quantumAttractorRemainingTime = 0;
      }
    }

    const attractionRangeSq = attractionRange * attractionRange;
    const now = performance.now() / 1000;
    const shouldCull = !this.isQuantumAttractorActive();

    const viewport = this.camera.getViewportBounds();
    const minX = viewport.x - CULL_PADDING;
    const minY = viewport.y - CULL_PADDING;
    const maxX = viewport.x + viewport.width + CULL_PADDING;
    const maxY = viewport.y + viewport.height + CULL_PADDING;

    const emissionChance = Math.min(0.16, 10 / Math.max(1, this.soa.count));
    const emitParticles = Math.random() < emissionChance;

    for (let i = this.soa.count - 1; i >= 0; i--) {
      // TTL expiration
      if (now - this.soa.spawnTime[i] >= this.soa.ttl[i]) {
        this.recycleIndex(i);
        continue;
      }

      const px = this.soa.x[i];
      const py = this.soa.y[i];

      // Viewport culling (skip off-screen when not in attractor mode)
      if (shouldCull && (px < minX || px > maxX || py < minY || py > maxY)) {
        continue;
      }

      // Rotation
      const cat = this.soa.category[i];
      this.soa.rotation[i] += ROTATION_SPEED_ARRAY[cat] * dt;

      // Particle emission (sparks)
      if (emitParticles) {
        let sparkColors: string[];
        switch (cat) {
          case PickupCategory.Block: {
            const blockId = this.soa.blockTypeId[i];
            if (blockId) {
              const tier = getTierFromBlockId(blockId);
              sparkColors = BLOCK_PICKUP_SPARK_COLOR_PALETTES[tier] ?? SPARK_OPTIONS.colors!;
            } else {
              sparkColors = ['#00ffff'];
            }
            break;
          }
          case PickupCategory.Repair:
            sparkColors = ['#ff4444', '#cc2222', '#ff0000', '#aa0000'];
            break;
          case PickupCategory.Currency:
          default:
            sparkColors = SPARK_OPTIONS.colors!;
            break;
        }

        // GC Neutral Particle emission
        REUSABLE_PARTICLE_OPTIONS.colors = sparkColors;
        this.tempVec.x = px;
        this.tempVec.y = py;
        this.sparkManager.emitParticle(this.tempVec, REUSABLE_PARTICLE_OPTIONS);
      }

      // Render sprite
      if (!this.soa.texture[i]) {
        this.soa.texture[i] = this.resolvePickupTextureSOA(i);
      }
      const texture = this.soa.texture[i];
      if (texture) {
        let width = BLOCK_SIZE;
        let height = BLOCK_SIZE;

        switch (cat) {
          case PickupCategory.Currency: {
            const scale = BASE_PICKUP_SCALE + Math.log2(this.soa.amount[i] + 1) / 7;
            width *= scale;
            height *= scale;
            break;
          }
          case PickupCategory.Repair: {
            const scale = BASE_PICKUP_SCALE + Math.log2(this.soa.amount[i] + 1) / 5;
            width *= scale;
            height *= scale;
            break;
          }
          case PickupCategory.Block:
            width *= BASE_BLOCK_PICKUP_SCALE;
            height *= BASE_BLOCK_PICKUP_SCALE;
            break;
          case PickupCategory.Quantum:
          case PickupCategory.ShipBlueprint:
            width = 176;
            height = 176;
            break;
        }

        GlobalSpriteRequestBus.add({
          texture,
          worldX: px,
          worldY: py,
          widthPx: width,
          heightPx: height,
          alpha: 1.0,
          rotation: this.soa.rotation[i],
        });
      }

      // Block-specific capacity check
      if (cat === PickupCategory.Block) {
        const current = this.playerResources.getBlockCount();
        const max = this.playerResources.getMaxBlockQueueSize();
        if (current >= max) continue;
      }

      // Attraction (moves toward ship, triggers pickup if within radius)
      const pickedUp = this.computeAttractionSOA(i, shipPos.x, shipPos.y, speedBoost, attractionRangeSq);
      if (pickedUp) {
        this.collectPickup(i);
      }
    }
  }

  private async collectPickup(i: number): Promise<void> {
    if (!this.playerShip) return;

    const cat = this.soa.category[i];
    const amt = this.soa.amount[i];
    const blockId = this.soa.blockTypeId[i];
    const shipId = this.soa.shipId[i];

    // Compute flash color (default or tier-based)
    let flashColor = PICKUP_FLASH_COLORS[cat] ?? '#ffffff';
    if (cat === PickupCategory.Block && blockId) {
      const tier = getTierFromBlockId(blockId);
      flashColor = BLOCK_PICKUP_LIGHT_TIER_COLORS[tier] ?? flashColor;
    }

    const playerPos = this.playerShip.getTransform().position;
    createLightFlash(playerPos.x, playerPos.y, 320 + Math.random() * 100, 1.2, 0.5, flashColor, 'pickup-currency');

    let playedSound = false;

    switch (cat) {
      case PickupCategory.Currency: {
        PlayerExperienceManager.getInstance().addEntropium(amt);
        missionResultStore.addEntropium(amt);

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
        break;
      }

      case PickupCategory.Block: {
        if (!blockId) break;

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

        const tier = getTierFromBlockId(blockId);
        const tierColor = BLOCK_TIER_COLORS[tier] ?? ['#fff'];
        createLightFlash(playerPos.x, playerPos.y, 360, 1.0, 0.5, tierColor, `blockPickup-${blockId}`);

        const blockType = getBlockType(blockId);
        if (blockType) {
          this.blockDropDecisionMenu.enqueueBlock(getTier1BlockIfTier0(blockType));
        }
        break;
      }

      case PickupCategory.Repair: {
        repairAllBlocksWithHealing(this.playerShip, amt, this.shipBuilderEffects);
        audioManager.play('assets/sounds/sfx/ship/repair_00.wav', 'sfx', { maxSimultaneous: 3 });
        break;
      }

      case PickupCategory.ShipBlueprint: {
        if (!shipId) {
          console.warn(`Ship blueprint pickup missing ship ID (index ${i})`);
          this.recycleIndex(i);
          return;
        }

        const shipCollection = PlayerShipCollection.getInstance();

        if (shipCollection.isUnlocked(shipId)) {
          audioManager.play('assets/sounds/sfx/ship/gather_00.wav', 'sfx', { maxSimultaneous: 8 });
          this.popupMessageSystem.displayMessage(`${shipId} already Unlocked`, {
            color: '#00FFFF',
            duration: 5,
            font: '28px monospace',
            glow: true,
          });
        } else {
          missionResultStore.addShipDiscovery(shipId);
          shipCollection.discover(shipId);
          shipCollection.unlock(shipId);

          audioManager.play('assets/sounds/sfx/magic/collect_ship.wav', 'sfx', { maxSimultaneous: 8 });
          this.popupMessageSystem.displayMessage(`${shipId} Blueprint Discovered!`, {
            color: '#00FFFF',
            duration: 5,
            font: '28px monospace',
            glow: true,
          });
        }

        createLightFlash(playerPos.x, playerPos.y, 900, 1.0, 0.5, '#00FFFF', `shipBlueprint-${shipId}`);
        break;
      }

      default: {
        // Only possible "other" type is Quantum Attractor
        reportPickupCollected('quantumAttractor');
        createLightFlash(playerPos.x, playerPos.y, 900, 1.0, 0.5, '#EFBF04');
        this.activateQuantumAttractor();
      }
    }

    // Recycle the pickup after processing (removes from SOA & cleans up light)
    this.recycleIndex(i);
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    const lighting = LightingOrchestrator.getInstance();

    // Remove all lights attached to active pickups
    for (let i = 0; i < this.soa.count; i++) {
      const lightId = this.soa.lightId[i];
      if (lightId) {
        lighting.removeLight(lightId);
        this.soa.lightId[i] = null;
      }
    }

    // Reset SOA state (retain buffers to avoid reallocating)
    this.soa.count = 0;
    this.freeIndices.length = 0;

    // Clear cached textures for blocks
    this.blockSpriteCache.clear();

    // Clear player ship reference
    this.playerShip = null;
  }
}
