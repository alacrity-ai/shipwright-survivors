// src/systems/physics/ThrusterEmitter.ts

import { ParticleManager } from '@/systems/fx/ParticleManager';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';
import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import { ENGINE_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { rotate } from '@/game/ship/utils/shipBlockUtils';

interface ThrusterDefinition {
  coord: GridCoord;
  block: BlockInstance; // now required
  blockRotation: number;
  shipRotation: number;
  shipPosition: { x: number; y: number };
}

const DEFAULT_FLAME_COLORS = ['#fff', '#f90', '#ff0'];

export class ThrusterEmitter {
  constructor(private readonly sparkManager: ParticleManager) {}

  emit(def: ThrusterDefinition): void {
    const { coord, blockRotation, shipRotation, shipPosition, block } = def;

    const BLOCK_SIZE = 32;
    const localBlockX = coord.x * BLOCK_SIZE;
    const localBlockY = coord.y * BLOCK_SIZE;

    const shipCos = Math.cos(shipRotation);
    const shipSin = Math.sin(shipRotation);

    const rotatedBlockX = localBlockX * shipCos - localBlockY * shipSin;
    const rotatedBlockY = localBlockX * shipSin + localBlockY * shipCos;

    const worldBlockX = shipPosition.x + rotatedBlockX;
    const worldBlockY = shipPosition.y + rotatedBlockY;

    const nozzleOffsetLocal = { x: 0, y: 16 };
    const blockRotRad = blockRotation * (Math.PI / 180);

    const nozzleRotatedByBlock = rotate(nozzleOffsetLocal.x, nozzleOffsetLocal.y, blockRotRad);
    const nozzleWorldOffset = rotate(nozzleRotatedByBlock.x, nozzleRotatedByBlock.y, shipRotation);

    const nozzleWorldX = worldBlockX + nozzleWorldOffset.x;
    const nozzleWorldY = worldBlockY + nozzleWorldOffset.y;

    const localExhaustDir = { x: Math.sin(blockRotRad), y: Math.cos(blockRotRad) };
    const worldExhaustDir = rotate(localExhaustDir.x, localExhaustDir.y, shipRotation);

    const blockId = block?.type.id ?? '';
    const flameColors = ENGINE_COLOR_PALETTES[blockId] ?? DEFAULT_FLAME_COLORS;

    for (let i = 0; i < 2; i++) {
      const randomJitterX = (Math.random() - 0.5) * 10;
      const randomJitterY = (Math.random() - 0.5) * 10;

      this.sparkManager.emitBurst(
        { x: nozzleWorldX, y: nozzleWorldY },
        1,
        {
          colors: flameColors,
          velocity: {
            x: worldExhaustDir.x * 40 + randomJitterX,
            y: worldExhaustDir.y * 40 + randomJitterY,
          },
          baseSpeed: 1,
          sizeRange: [1, 3],
          lifeRange: [0.2, 0.35],
          fadeOut: true,
        }
      );
    }
  }
}
