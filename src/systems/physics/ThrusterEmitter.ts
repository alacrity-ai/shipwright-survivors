import { ParticleManager } from '@/systems/fx/ParticleManager';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import { ENGINE_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { BLOCK_SIZE } from '@/config/view';
import { createPointLight } from '@/lighting/lights/createPointLight';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';

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
// const JITTER_RANGE = 10;
const LIGHT_CHANCE = 0.1;

// // Pre-allocate reusable objects
// const tempVec = { x: 0, y: 0 };
// const tempOffset = { x: 0, y: 0 };
// const tempDir = { x: 0, y: 0 };

export class ThrusterEmitter {
  private readonly playerSettings: PlayerSettingsManager;
  private readonly lightingOrchestrator: LightingOrchestrator;
  
  // Cache for expensive lookups
  private readonly colorCache = new Map<string, string[]>();
  
  constructor(
    private readonly sparkManager: ParticleManager,
  ) {
    // Cache singletons to avoid repeated getInstance() calls
    this.playerSettings = PlayerSettingsManager.getInstance();
    this.lightingOrchestrator = LightingOrchestrator.getInstance();
  }

  emit(def: ThrusterDefinition): void {
    if (!this.playerSettings.isParticlesEnabled()) return;

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

    // === Position and Direction Computation ===
    const shipCos = Math.cos(shipRotation);
    const shipSin = Math.sin(shipRotation);
    const blockRotRad = blockRotation * (Math.PI / 180);

    const localBlockX = coord.x * BLOCK_SIZE;
    const localBlockY = coord.y * BLOCK_SIZE;

    const worldBlockX = shipPosition.x + (localBlockX * shipCos - localBlockY * shipSin);
    const worldBlockY = shipPosition.y + (localBlockX * shipSin + localBlockY * shipCos);

    // Nozzle position (local offset rotated)
    const blockCos = Math.cos(blockRotRad);
    const blockSin = Math.sin(blockRotRad);
    const nozzleOffsetX = -NOZZLE_OFFSET_Y * blockSin;
    const nozzleOffsetY = NOZZLE_OFFSET_Y * blockCos;

    const nozzleWorldX = worldBlockX + (nozzleOffsetX * shipCos - nozzleOffsetY * shipSin);
    const nozzleWorldY = worldBlockY + (nozzleOffsetX * shipSin + nozzleOffsetY * shipCos);

    const exhaustDirX = blockSin * shipCos - blockCos * shipSin;
    const exhaustDirY = blockSin * shipSin + blockCos * shipCos;

    // Base velocity
    const baseVelX = exhaustDirX * EXHAUST_SPEED;
    const baseVelY = exhaustDirY * EXHAUST_SPEED;

    // === Main Exhaust Particles ===
    const mainParticleVelocity = {
      x: baseVelX * (afterBurner ? 3 : 1),
      y: baseVelY * (afterBurner ? 3 : 1),
    };

    this.sparkManager.emitBurst({ x: nozzleWorldX, y: nozzleWorldY }, 2, {
      colors: flameColors,
      velocity: mainParticleVelocity,
      baseSpeed: 1,
      sizeRange: afterBurner ? [2, 4] : [1, 3],
      lifeRange: [0.08, 0.18],
      fadeOut: true,
    });

    // === Afterburner Just Activated Special Effects ===
    if (afterBurnerJustActivated) {
      const pos = { x: nozzleWorldX, y: nozzleWorldY };

      let flashRadius = 220;
      let flashColor = '#ffffff';
      let burstColors = ['#ffffcc', '#ffee88', '#ffaa44'];
      let burstCount = 12;

      if (pulseJustActivated) {
        flashRadius = 300;
        flashColor = '#ffcc00';
        burstColors = ['#ffcc00', '#ffaa00', '#ff8800'];
        burstCount = 18;
      }

      if (superPulseJustActivated) {
        flashRadius = 300;
        flashColor = '#00ffff';
        burstColors = ['#ccffff', '#88ddff', '#ffffff'];
        burstCount = 24;
      }

      createLightFlash(pos.x, pos.y, flashRadius, 1.0, 0.35, flashColor);

      this.sparkManager.emitBurst(pos, burstCount, {
        colors: burstColors,
        randomDirection: true,
        speedRange: [120, 320],
        sizeRange: [1, 3],
        lifeRange: [0.25, 0.65],
        fadeOut: true,
      });
    }

    // === Lighting ===
    if (this.playerSettings.isLightingEnabled() && Math.random() < LIGHT_CHANCE) {
      const light = createPointLight({
        x: nozzleWorldX,
        y: nozzleWorldY,
        radius: 25 + Math.random() * 50,
        color: flameColors[0],
        intensity: 1 + Math.random() * 0.5,
        life: 0.45 + Math.random() * 0.15,
        expires: true,
      });

      this.lightingOrchestrator.registerLight(light);
    }
  }
}

