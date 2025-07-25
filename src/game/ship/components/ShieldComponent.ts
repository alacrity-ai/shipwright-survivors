// src/game/ship/components/ShieldComponent.ts

import type { Ship } from '@/game/ship/Ship';
import { BLOCK_SIZE } from '@/config/view';
import { ShieldEffectsSystem } from '@/systems/fx/ShieldEffectsSystem';
import { SHIELDED_BLOCK_HIGHLIGHT_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import { getBlockTypeByIndex } from '@/game/blocks/BlockRegistry';

import { hexToRgbaVec4, packColorToInt } from '@/rendering/unified/helpers/hexToRgbaVec4';

export class ShieldComponent {
  private active = false;
  private ownerShip: Ship;
  private protectedBlocks = new Set<number>(); // BlockStore indices

  constructor(ownerShip: Ship) {
    this.ownerShip = ownerShip;
  }

  /** Recomputes shield coverage from all registered emitters */
  recalculateCoverage(): void {
    const store = BlockManager.getInstance().getBlockStore();

    // Step 1: Clear old flags and cached efficiencies
    for (const idx of this.protectedBlocks) {
      store.isShielded[idx] = 0;
      store.shieldEfficiency[idx] = 0;
      store.shieldHighlightColor[idx] = 0;
      store.shieldSourceId[idx] = 0;
    }
    this.protectedBlocks.clear();

    const emitters = Array.from(this.ownerShip.getShieldBlockIndices());
    const fx = ShieldEffectsSystem.getInstance();
    fx.clearVisualsForShip(this.ownerShip.numericId);

    // If no shield blocks remain, force deactivation
    if (emitters.length === 0) {
      this.deactivate();
      return;
    }

    // === Retrieve passive bonuses ===
    const passiveRadiusBonus = this.ownerShip.getPassiveBonus('shield-radius');         // additive
    const passiveEfficiencyBonus = this.ownerShip.getPassiveBonus('shield-efficiency'); // multiplicative

    // Step 2: Recalculate coverage from each emitter
    for (const emitterIdx of emitters) {
      const typeIdx = store.typeIndex[emitterIdx];
      const type = getBlockTypeByIndex(typeIdx);
      if (!type) continue;

      const baseRadius = type.behavior?.shieldRadius ?? 0;
      const baseEfficiency = type.behavior?.shieldEfficiency ?? 0;

      const gridRadius = baseRadius + passiveRadiusBonus;
      const shieldEfficiency = baseEfficiency * passiveEfficiencyBonus;

      const highlightColor =
        SHIELDED_BLOCK_HIGHLIGHT_COLOR_PALETTES[type.id] ?? 'rgba(100, 255, 255, 0.4)';

      // Retrieve the emitter's grid coordinate from BlockStore
      const ex = store.localX[emitterIdx];
      const ey = store.localY[emitterIdx];
      const centerCoord = { x: ex, y: ey };

      // Query blocks within the grid radius
      const coveredIndices = this.ownerShip.getBlocksWithinGridDistance(centerCoord, gridRadius);

      for (const idx of coveredIndices) {
        this.protectedBlocks.add(idx);

        const currentEff = store.shieldEfficiency[idx] ?? 0;
        if (shieldEfficiency >= currentEff) {
          const [r, g, b, a] = hexToRgbaVec4(highlightColor);
          const packedColor = packColorToInt(r, g, b, a);

          store.shieldEfficiency[idx] = shieldEfficiency;
          store.shieldHighlightColor[idx] = packedColor;
          store.shieldSourceId[idx] = type.id as any; // store id for FX/debug
        }

        if (this.active) {
          store.isShielded[idx] = 1;
          fx.registerShieldedBlock(idx);
        }
      }

      // Step 3: Visual FX (shield bubble itself)
      if (this.active) {
        const worldRadius = gridRadius * BLOCK_SIZE;
        fx.registerShield(emitterIdx, worldRadius);
      }
    }
  }

  /** Activates shield visual + logic */
  activate(): void {
    this.active = true;
    this.recalculateCoverage();

    const fx = ShieldEffectsSystem.getInstance();
    fx.clearVisualsForShip(this.ownerShip.numericId);

    const store = BlockManager.getInstance().getBlockStore();
    for (const idx of this.protectedBlocks) {
      store.isShielded[idx] = 1;
      fx.registerShieldedBlock(idx);
    }

    for (const emitterIdx of this.ownerShip.getShieldBlockIndices()) {
      const typeIdx = store.typeIndex[emitterIdx];
      const type = getBlockTypeByIndex(typeIdx);
      const gridRadius = type?.behavior?.shieldRadius ?? 0;
      const worldRadius = gridRadius * BLOCK_SIZE;
      fx.registerShield(emitterIdx, worldRadius);
    }
  }

  /** Deactivates shield, clears all flags + FX */
  deactivate(): void {
    this.active = false;

    const store = BlockManager.getInstance().getBlockStore();
    const fx = ShieldEffectsSystem.getInstance();
    fx.clearVisualsForShip(this.ownerShip.numericId);

    for (const idx of this.protectedBlocks) {
      store.isShielded[idx] = 0;
      store.shieldEfficiency[idx] = 0;
      store.shieldHighlightColor[idx] = 0;
      store.shieldSourceId[idx] = 0;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  /** True if any shield-emitter blocks exist on this ship */
  hasShieldBlocks(): boolean {
    for (const _ of this.ownerShip.getShieldBlockIndices()) {
      return true;
    }
    return false;
  }
}
