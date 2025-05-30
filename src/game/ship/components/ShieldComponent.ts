// src/game/ship/components/ShieldComponent.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { Ship } from '@/game/ship/Ship';
import { getDistance } from '@/systems/ai/helpers/VectorUtils';

export class ShieldComponent {
  private active = false;
  private ownerShip: Ship;
  private protectedBlocks = new Set<BlockInstance>();

  constructor(ownerShip: Ship) {
    this.ownerShip = ownerShip;
  }

  /** Called after ship layout changes */
  recalculateCoverage(): void {
    this.protectedBlocks.clear();

    const blocks = this.ownerShip.getAllBlocks();
    const emitters = blocks.filter(([, b]) => b.type.behavior?.shieldRadius);

    for (const [_, candidate] of blocks) {
      const candidatePos = this.ownerShip.getBlockWorldPosition(candidate);

      for (const [_, emitter] of emitters) {
        const radius = emitter.type.behavior!.shieldRadius!;
        const emitterPos = this.ownerShip.getBlockWorldPosition(emitter);

        if (getDistance(candidatePos, emitterPos) <= radius) {
          this.protectedBlocks.add(candidate);
          break;
        }
      }
    }
  }

  activate(): void {
    this.active = true;
    for (const block of this.protectedBlocks) {
      block.isShielded = true;
    }
  }

  deactivate(): void {
    this.active = false;
    for (const block of this.protectedBlocks) {
      block.isShielded = false;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Attempt to absorb damage using the ship’s energy component.
   * Returns true if successfully absorbed.
   */
  maybeAbsorbDamage(block: BlockInstance, damage: number): boolean {
    if (!this.active || !this.protectedBlocks.has(block)) return false;

    const shipEnergy = this.ownerShip.getEnergyComponent();
    if (!shipEnergy) return false;

    const blockPos = this.ownerShip.getBlockWorldPosition(block);
    const emitters = this.ownerShip.getAllBlocks().filter(([, b]) => b.type.behavior?.shieldRadius);

    let bestEfficiency = 0;

    for (const [, emitter] of emitters) {
      const radius = emitter.type.behavior!.shieldRadius!;
      const efficiency = emitter.type.behavior!.shieldEfficiency ?? 0;
      const emitterPos = this.ownerShip.getBlockWorldPosition(emitter);

      if (getDistance(blockPos, emitterPos) <= radius) {
        bestEfficiency = Math.max(bestEfficiency, efficiency);
      }
    }

    if (bestEfficiency <= 0) return false;

    const energyCost = damage * bestEfficiency;
    return shipEnergy.spend(energyCost);
  }
}
