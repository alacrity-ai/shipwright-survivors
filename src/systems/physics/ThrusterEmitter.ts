import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import { ENGINE_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { BLOCK_SIZE } from '@/config/view';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import type { ParticleManager } from '@/systems/fx/ParticleManager';

interface ThrusterDefinition {
  coord: GridCoord;
  block: BlockInstance;
  blockRotation: number;
  shipRotation: number;
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

// Promote static burst color palettes to constants
const BURST_COLORS_DEFAULT = ['#ffffcc', '#ffee88', '#ffaa44'];
const BURST_COLORS_PULSE = ['#ffcc00', '#ffaa00', '#ff8800'];
const BURST_COLORS_SUPER = ['#ccffff', '#88ddff', '#ffffff'];

export class ThrusterEmitter {
  private readonly colorCache = new Map<string, string[]>();

  // === Cached objects to eliminate transient allocation ===
  private readonly cachedVelocity = { x: 0, y: 0 };
  private readonly cachedPosition = { x: 0, y: 0 };

  constructor(private readonly sparkManager: ParticleManager) {}
  emit(def: ThrusterDefinition): void {
    const {
      coord, blockRotation, shipRotation, shipPosition, block,
      afterBurner, afterBurnerJustActivated,
      pulseJustActivated, superPulseJustActivated,
    } = def;

    const blockId = block?.type.id ?? '';
    const flameColors = this.colorCache.get(blockId)
      ?? ENGINE_COLOR_PALETTES[blockId]
      ?? DEFAULT_FLAME_COLORS;

    this.colorCache.set(blockId, flameColors);

    // === Compute world position of block center ===
    const shipCos = Math.cos(shipRotation);
    const shipSin = Math.sin(shipRotation);
    const blockRotRad = blockRotation * (Math.PI / 180);

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

    // === Reuse cached velocity object ===
    this.cachedVelocity.x = exhaustDirX * EXHAUST_SPEED * scale;
    this.cachedVelocity.y = exhaustDirY * EXHAUST_SPEED * scale;

    // === Reuse cached position object ===
    this.cachedPosition.x = nozzleWorldX;
    this.cachedPosition.y = nozzleWorldY;

    // === Emit standard flame particles ===
    this.sparkManager.emitBurst(this.cachedPosition, 2, {
      colors: flameColors,
      velocity: this.cachedVelocity,
      baseSpeed: 1,
      sizeRange: afterBurner ? [2, 4] : [1, 3],
      lifeRange: [0.08, 0.18],
      fadeOut: true,
    });

    // === Afterburner Just Activated Effects ===
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

    // === Occasional point light flash ===
    if (Math.random() < LIGHT_CHANCE) {
      createLightFlash(nozzleWorldX, nozzleWorldY, 70, 1.0, 0.5, flameColors[0]);
    }
  }
}
