import { ParticleManager } from '@/systems/fx/ParticleManager';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import { ENGINE_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { rotate } from '@/game/ship/utils/shipBlockUtils';
import { createPointLight } from '@/lighting/lights/createPointLight';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

interface ThrusterDefinition {
  coord: GridCoord;
  block: BlockInstance;
  blockRotation: number;
  shipRotation: number;
  shipPosition: { x: number; y: number };
}

const DEFAULT_FLAME_COLORS = ['#fff', '#f90', '#ff0'];
const BLOCK_SIZE = 32;
const NOZZLE_OFFSET_Y = 16;
const EXHAUST_SPEED = 40;
const JITTER_RANGE = 10;
const LIGHT_CHANCE = 0.1;

// Pre-allocate reusable objects
const tempVec = { x: 0, y: 0 };
const tempOffset = { x: 0, y: 0 };
const tempDir = { x: 0, y: 0 };

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

    // TODO: These calculations are causing noticeable slowdown.  This needs to be re-evaluated.
    // We can potentially use GPU Shaders, directly on the blocks - Or render lights directly on the blocks
    // And we should do it in a script that is already calculating block positions, to save on CPU/cycles

    const { coord, blockRotation, shipRotation, shipPosition, block } = def;

    // Pre-calculate trig values once
    const shipCos = Math.cos(shipRotation);
    const shipSin = Math.sin(shipRotation);
    const blockRotRad = blockRotation * 0.017453292519943295; // Math.PI / 180 pre-calculated

    // Calculate world block position
    const localBlockX = coord.x * BLOCK_SIZE;
    const localBlockY = coord.y * BLOCK_SIZE;
    
    const worldBlockX = shipPosition.x + (localBlockX * shipCos - localBlockY * shipSin);
    const worldBlockY = shipPosition.y + (localBlockX * shipSin + localBlockY * shipCos);

    // Calculate nozzle position (reuse temp objects)
    tempOffset.x = 0;
    tempOffset.y = NOZZLE_OFFSET_Y;
    
    // Inline rotation to avoid function call overhead
    const blockCos = Math.cos(blockRotRad);
    const blockSin = Math.sin(blockRotRad);
    
    const nozzleRotX = tempOffset.x * blockCos - tempOffset.y * blockSin;
    const nozzleRotY = tempOffset.x * blockSin + tempOffset.y * blockCos;
    
    const nozzleWorldX = worldBlockX + (nozzleRotX * shipCos - nozzleRotY * shipSin);
    const nozzleWorldY = worldBlockY + (nozzleRotX * shipSin + nozzleRotY * shipCos);

    // Calculate exhaust direction (inline rotation)
    const localExhaustX = blockSin; // Math.sin(blockRotRad)
    const localExhaustY = blockCos; // Math.cos(blockRotRad)
    
    const worldExhaustX = localExhaustX * shipCos - localExhaustY * shipSin;
    const worldExhaustY = localExhaustX * shipSin + localExhaustY * shipCos;

    // Get flame colors with caching
    const blockId = block?.type.id ?? '';
    let flameColors = this.colorCache.get(blockId);
    if (!flameColors) {
      flameColors = ENGINE_COLOR_PALETTES[blockId] ?? DEFAULT_FLAME_COLORS;
      this.colorCache.set(blockId, flameColors);
    }

    // Emit particles (reduced loop overhead)
    const baseVelX = worldExhaustX * EXHAUST_SPEED;
    const baseVelY = worldExhaustY * EXHAUST_SPEED;
    
    tempVec.x = nozzleWorldX;
    tempVec.y = nozzleWorldY;
    
    // Emit both particles in one go to reduce function call overhead
    this.sparkManager.emitBurst(
      tempVec,
      2, // Emit 2 particles at once instead of looping
      {
        colors: flameColors,
        velocity: {
          x: baseVelX,
          y: baseVelY,
        },
        baseSpeed: 1,
        sizeRange: [1, 3],
        lifeRange: [0.2, 0.35],
        fadeOut: true,
      }
    );

    // Stochastic lighting (early return pattern)
    if (!this.playerSettings.isLightingEnabled() || Math.random() >= LIGHT_CHANCE) {
      return;
    }

    const light = createPointLight({
      x: nozzleWorldX,
      y: nozzleWorldY,
      radius: 25 + Math.random() * 50,
      color: flameColors[0],
      intensity: 0.25 + Math.random() * 0.1,
      life: 0.45 + Math.random() * 0.15,
      expires: true,
    });

    this.lightingOrchestrator.registerLight(light);
  }
}
