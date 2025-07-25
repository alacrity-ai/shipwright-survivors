// src/systems/physics/ThrusterEmitter.ts

import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import { ENGINE_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { BLOCK_SIZE } from '@/config/view';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import { BlockManager } from '@/game/blocks/system/BlockManager';

interface ThrusterEmitDefinition {
  idx: number;                     // BlockStore index (SOA)
  coord: GridCoord;                // Local block coordinate
  rotation: number;                // Local block rotation (radians)
  shipRotation: number;            // World ship rotation (radians)
  shipPosition: { x: number; y: number };
  afterBurner?: boolean;
  afterBurnerJustActivated?: boolean;
  isPulsing?: boolean;
  pulseJustActivated?: boolean;
  superPulseJustActivated?: boolean;
}

const DEFAULT_FLAME_COLORS = ['#fff', '#f90', '#ff0'];
const NOZZLE_OFFSET_Y = 16;
const EXHAUST_SPEED = 100;
const LIGHT_CHANCE = 0.1;

// Burst palettes for pulses
const BURST_COLORS_DEFAULT = ['#ffffcc', '#ffee88', '#ffaa44'];
const BURST_COLORS_PULSE = ['#ffcc00', '#ffaa00', '#ff8800'];
const BURST_COLORS_SUPER = ['#ccffff', '#88ddff', '#ffffff'];

export class ThrusterEmitter {
  private readonly colorCache = new Map<number, string[]>();

  private readonly cachedVelocity = { x: 0, y: 0 };
  private readonly cachedPosition = { x: 0, y: 0 };

  private readonly store = BlockManager.getInstance().store;

  constructor(private readonly sparkManager: ParticleManager) {}

  emit(def: ThrusterEmitDefinition): void {
    const {
      idx, coord, rotation, shipRotation, shipPosition,
      afterBurner, afterBurnerJustActivated,
      pulseJustActivated, superPulseJustActivated,
    } = def;

    if (!this.store.isAllocated(idx)) return;

    // Resolve engine flame colors based on tier directly
    const tier = this.store.tier[idx];
    const flameColors = this.colorCache.get(tier)
      ?? ENGINE_COLOR_PALETTES[tier]
      ?? DEFAULT_FLAME_COLORS;

    // Cache by tier (not typeIdx) since the palette is tier-based
    if (!this.colorCache.has(tier)) {
      this.colorCache.set(tier, flameColors);
    }

    // === Compute world position of the block ===
    const shipCos = Math.cos(shipRotation);
    const shipSin = Math.sin(shipRotation);
    const blockRotRad = rotation * (Math.PI / 180);

    const localBlockX = coord.x * BLOCK_SIZE;
    const localBlockY = coord.y * BLOCK_SIZE;

    const worldBlockX = shipPosition.x + (localBlockX * shipCos - localBlockY * shipSin);
    const worldBlockY = shipPosition.y + (localBlockX * shipSin + localBlockY * shipCos);

    // === Compute nozzle offset ===
    const blockCos = Math.cos(blockRotRad);
    const blockSin = Math.sin(blockRotRad);
    const nozzleOffsetX = -NOZZLE_OFFSET_Y * blockSin;
    const nozzleOffsetY = NOZZLE_OFFSET_Y * blockCos;

    const nozzleWorldX = worldBlockX + (nozzleOffsetX * shipCos - nozzleOffsetY * shipSin);
    const nozzleWorldY = worldBlockY + (nozzleOffsetX * shipSin + nozzleOffsetY * shipCos);

    const exhaustDirX = blockSin * shipCos - blockCos * shipSin;
    const exhaustDirY = blockSin * shipSin + blockCos * shipCos;

    const scale = afterBurner ? 3 : 1;

    // === Cache objects for GC-neutral velocity/position ===
    this.cachedVelocity.x = exhaustDirX * EXHAUST_SPEED * scale;
    this.cachedVelocity.y = exhaustDirY * EXHAUST_SPEED * scale;

    this.cachedPosition.x = nozzleWorldX;
    this.cachedPosition.y = nozzleWorldY;

    // === Emit the flame particles ===
    this.sparkManager.emitPairFast(
      this.cachedPosition,
      this.cachedVelocity.x,
      this.cachedVelocity.y,
      flameColors as [string, string, string]
    );

    // === Afterburner Burst FX ===
    if (afterBurnerJustActivated) {
      let flashRadius = 220;
      let flashColor = '#ffffff';
      let burstColors = BURST_COLORS_DEFAULT;
      let burstCount = 12;

      if (pulseJustActivated) {
        flashRadius = 300;
        flashColor = '#ffcc00';
        burstColors = BURST_COLORS_PULSE;
        burstCount = 18;
      }

      if (superPulseJustActivated) {
        flashRadius = 300;
        flashColor = '#00ffff';
        burstColors = BURST_COLORS_SUPER;
        burstCount = 24;
      }

      createLightFlash(nozzleWorldX, nozzleWorldY, flashRadius, 1.0, 0.35, flashColor);

      this.sparkManager.emitBurst(this.cachedPosition, burstCount, {
        colors: burstColors,
        randomDirection: true,
        speedRange: [120, 320],
        sizeRange: [1, 3],
        lifeRange: [0.25, 0.65],
        fadeOut: true,
      });
    }

    // === Random point light flash ===
    if (Math.random() < LIGHT_CHANCE) {
      createLightFlash(nozzleWorldX, nozzleWorldY, 70, 1.0, 0.5, flameColors[0]);
    }
  }
}
