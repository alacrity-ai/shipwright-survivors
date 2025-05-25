// src/systems/physics/ThrusterEmitter.ts

import { ThrusterParticleSystem } from '@/systems/physics/ThrusterParticleSystem';
import { randomFlameColor } from '@/systems/physics/ThrusterParticleSystem';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';

interface ThrusterDefinition {
  coord: GridCoord;
  blockRotation: number;
  shipRotation: number;
  shipPosition: { x: number; y: number };
}

export class ThrusterEmitter {
  constructor(private readonly fx: ThrusterParticleSystem) {}

  emit(def: ThrusterDefinition) {
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

    this.fx.spawn({
      position: { x: nozzleWorldX, y: nozzleWorldY },
      velocity: {
        x: worldExhaustDir.x * 40 + (Math.random() - 0.5) * 10,
        y: worldExhaustDir.y * 40 + (Math.random() - 0.5) * 10,
      },
      color: randomFlameColor(),
      size: Math.random() * 2 + 1,
      life: 0.2 + Math.random() * 0.15,
    });
  }
}
