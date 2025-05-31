// src/game/ship/components/ShieldComponent.ts

import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
import type { Ship } from '@/game/ship/Ship';
import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry';
import { ShieldEffectsSystem } from '@/systems/fx/ShieldEffectsSystem';
import { SHIELDED_BLOCK_HIGHLIGHT_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';

export class ShieldComponent {
  private active = false;
  private ownerShip: Ship;
  private protectedBlocks = new Set<BlockInstance>();

  constructor(ownerShip: Ship) {
    this.ownerShip = ownerShip;
  }

  /** Recomputes shield coverage from all registered emitters */
  recalculateCoverage(): void {
    // Step 1: Clear old flags and cached efficiencies
    for (const block of this.protectedBlocks) {
      block.isShielded = false;
      block.shieldEfficiency = undefined;
      block.shieldHighlightColor = undefined;
      block.shieldSourceId = undefined;
    }
    this.protectedBlocks.clear();

    const emittersIterable = this.ownerShip.getShieldBlocks();
    const emitters = Array.from(emittersIterable);
    const fx = ShieldEffectsSystem.getInstance();
    fx.clearVisualsForShip(this.ownerShip.id);

    // If no shield blocks remain, force deactivation
    if (emitters.length === 0) {
      this.deactivate();
      return;
    }

    // Step 2: Recalculate coverage from emitters
    for (const emitter of emitters) {
      const emitterCoord = this.ownerShip.getBlockCoord(emitter);
      if (!emitterCoord) continue;

      const gridRadius = emitter.type.behavior?.shieldRadius ?? 0;
      const shieldEfficiency = emitter.type.behavior?.shieldEfficiency ?? 0;
      const highlightColor =
        SHIELDED_BLOCK_HIGHLIGHT_COLOR_PALETTES[emitter.type.id] ?? 'rgba(100, 255, 255, 0.4)';

      const coveredBlocks = this.ownerShip.getBlocksWithinGridDistance(emitterCoord, gridRadius);

      for (const block of coveredBlocks) {
        this.protectedBlocks.add(block);

        const existingEfficiency = block.shieldEfficiency ?? 0;

        // Only update if this emitter is as strong or stronger
        if (shieldEfficiency >= existingEfficiency) {
          block.shieldEfficiency = shieldEfficiency;
          block.shieldHighlightColor = highlightColor;
          block.shieldSourceId = emitter.type.id;
        }

        if (this.active) {
          block.isShielded = true;
          fx.registerShieldedBlock(block);
        }
      }

      // Step 3: Visual FX
      if (this.active) {
        const worldRadius = gridRadius * BLOCK_SIZE;
        fx.registerShield(emitter, worldRadius);
      }
    }
  }

  activate(): void {
    this.active = true;

    // Always recompute coverage when (re)activating
    this.recalculateCoverage();

    const fx = ShieldEffectsSystem.getInstance();
    fx.clearVisualsForShip(this.ownerShip.id);

    for (const block of this.protectedBlocks) {
      block.isShielded = true;
      fx.registerShieldedBlock(block);
    }

    for (const emitter of this.ownerShip.getShieldBlocks()) {
      const gridRadius = emitter.type.behavior?.shieldRadius ?? 0;
      const worldRadius = gridRadius * BLOCK_SIZE;
      fx.registerShield(emitter, worldRadius);
    }
  }

  deactivate(): void {
    this.active = false;

    const fx = ShieldEffectsSystem.getInstance();
    fx.clearVisualsForShip(this.ownerShip.id);

    for (const block of this.protectedBlocks) {
      block.isShielded = false;
      block.shieldEfficiency = undefined;
      block.shieldHighlightColor = undefined;
      block.shieldSourceId = undefined;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  /** True if any shield blocks exist on the ship */
  hasShieldBlocks(): boolean {
    for (const _ of this.ownerShip.getShieldBlocks()) {
      return true;
    }
    return false;
  }
}
