// src/systems/physics/ThrusterEmitter.ts

import { SparkManager } from '@/systems/fx/SparkManager';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';

interface ThrusterDefinition {
  coord: GridCoord;
  blockRotation: number;
  shipRotation: number;
  shipPosition: { x: number; y: number };
}

const FLAME_COLORS = ['#fff', '#f90', '#ff0'];

export class ThrusterEmitter {
  constructor(private readonly sparkManager: SparkManager) {}

  emit(def: ThrusterDefinition): void {
    const { coord, blockRotation, shipRotation, shipPosition } = def;

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

    const rotate = (x: number, y: number, a: number) => ({
      x: x * Math.cos(a) - y * Math.sin(a),
      y: x * Math.sin(a) + y * Math.cos(a),
    });

    const nozzleRotatedByBlock = rotate(nozzleOffsetLocal.x, nozzleOffsetLocal.y, blockRotRad);
    const nozzleWorldOffset = rotate(nozzleRotatedByBlock.x, nozzleRotatedByBlock.y, shipRotation);

    const nozzleWorldX = worldBlockX + nozzleWorldOffset.x;
    const nozzleWorldY = worldBlockY + nozzleWorldOffset.y;

    const localExhaustDir = { x: Math.sin(blockRotRad), y: Math.cos(blockRotRad) };
    const worldExhaustDir = rotate(localExhaustDir.x, localExhaustDir.y, shipRotation);

    // Emit two directional sparks per thruster per frame
    for (let i = 0; i < 2; i++) {
      const randomJitterX = (Math.random() - 0.5) * 10;
      const randomJitterY = (Math.random() - 0.5) * 10;

      this.sparkManager.emitBurst(
        { x: nozzleWorldX, y: nozzleWorldY },
        1,
        {
          colors: FLAME_COLORS,
          velocity: {
            x: worldExhaustDir.x * 40 + randomJitterX,
            y: worldExhaustDir.y * 40 + randomJitterY,
          },
          baseSpeed: 1,
          sizeRange: [1, 3],
          lifeRange: [0.2, 0.35],
        }
      );
    }
  }
}
