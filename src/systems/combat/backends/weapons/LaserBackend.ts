// ────────────────────────────────────────────────────────────────────────────────
// src/systems/combat/backends/weapons/LaserBackend.ts
// ────────────────────────────────────────────────────────────────────────────────
/**
 * Instant-hit laser implementation.
 *
 * This backend traverses all blocks whose `behavior.fire.fireType === 'laser'`
 * and, when a firing intent is present, performs the following pipeline:
 *
 *  1.  Compute world-space muzzle position for the block.
 *  2.  Select an eligible target ship with `findRandomTargetInRange`.
 *  3.  Ray-march through the spatial `Grid` to acquire the first occluding block.
 *  4.  Emit the laser-beam visual via `spawnLaserBeam`.
 *  5.  Inflict immediate damage on the impacted block.
 *  6.  If chain ability is active, jump to up to 2 additional targets.
 *
 * Beam weapons are *state-less* once fired; therefore the backend maintains no
 * persistent projectile list—contrasting with HeatSeeker or Turret backends.
 *
 * Design notes
 * ------------
 * • The class is deliberately free of *render-phase* responsibilities; the
 *   visual artifact is delegated to `spawnLaserBeam`, which itself manages the beam
 * • All tunable statistics (cool-down, damage, range, colour, etc.) are pulled
 *   from the block definition and then optionally modulated by ship passives /
 *   power-ups, ensuring a single source-of-truth for balance data.
 */

import type { WeaponBackend }          from '@/systems/combat/WeaponSystem';
import type { Ship }                   from '@/game/ship/Ship';
import type { BlockEntityTransform }   from '@/game/interfaces/types/BlockEntityTransform';
import type { WeaponIntent }           from '@/core/intent/interfaces/WeaponIntent';
import type { CombatService }          from '@/systems/combat/CombatService';
import type { ParticleManager }        from '@/systems/fx/ParticleManager';
import type { ShipSkillEffectMetadata } from '@/game/ship/skills/interfaces/ShipSkillEffectMetadata';

import type { BlockStore } from '@/game/blocks/system/BlockStore';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import { BlockSubcategoryEnum } from '@/game/interfaces/types/BlockType';

import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';

import { findRandomTargetInRange }     from '@/systems/ai/helpers/ShipUtils';
import { spawnLaserBeam }              from '@/systems/fx/helpers/boltSpawners';

const LASER_BEAM_EXTENSION_PX = 80;
const CHAIN_RANGE_PX = 1500; // Range to search for chain targets

/** Helper colour palette keyed by block tier (fallback: cyan). */
import { LASER_TIER_COLORS_RGBA, BLOCK_TIER_COLORS }           from '@/game/blocks/BlockColorSchemes';

export class LaserBackend implements WeaponBackend {

  private skillEffects: ShipSkillEffectMetadata = {};

  private store: BlockStore;

  // ═════════════════════════════════════════════════════════════════════════════
  // Construction
  // ═════════════════════════════════════════════════════════════════════════════
  constructor(
    private readonly combatService : CombatService,
    private readonly particleManager: ParticleManager,
  ) {
    this.store = BlockManager.getInstance().getBlockStore();
    this.skillEffects = PlayerShipCollection.getInstance().getSkillEffectsForActiveShip();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Public API
  // ═════════════════════════════════════════════════════════════════════════════
  
  // Per frame
  update(
    dt: number,
    ship: Ship,
    xform: BlockEntityTransform,
    intent: WeaponIntent | null,
  ): void {
    if (!intent?.firePrimary) return;

    const store = this.store;

    // ─── Filter only laser-emitter blocks via SOA subcategory (no BlockType) ─────
    const firingPlan = ship.getFiringPlan().filter(entry =>
      store.subcategoryCode[entry.blockIndex] === BlockSubcategoryEnum.Laser
    );
    if (firingPlan.length === 0) return;

    // ─── Passive and skill bonuses (frame-level) ─────────────────────────────────
    const {
      laserDamage = 0,
      laserFiringRate = 0,
      laserRange = 0,
      laserChain = false,
      laserAreaOfEffect = false, // Reserved for future AoE behavior
    } = this.skillEffects;

    const passiveRangeMultiplier = ship.getPassiveBonus('laser-firing-range');
    let fireRateBonus = 1.0;
    let damageBonus = ship.getPassiveBonus('laser-damage');
    const { fireRateMultiplier = 0, baseDamageMultiplier = 0 } = ship.getPowerupBonus();
    fireRateBonus += fireRateMultiplier + laserFiringRate;
    damageBonus += baseDamageMultiplier;

    // ─── Iterate over each laser-emitting block (SOA indices) ────────────────────
    for (const emitter of firingPlan) {
      const idx = emitter.blockIndex;

      // Skip removed or deallocated blocks
      if (store.ownerShipId[idx] === 0) continue;

      emitter.timeSinceLastShot += dt;
      if (emitter.timeSinceLastShot < emitter.fireCooldown / fireRateBonus) continue;
      emitter.timeSinceLastShot = 0;

      // Pre-flattened laser-specific attributes (energyCost is deprecated; assume 0)
      const targetingRange = store.targetingRange[idx] || 0;
      const fireDamage = store.fireDamage[idx] || 0;
      const lifetime = store.projectileLifetime[idx] || 0.5; // lasers use lifetime as beam duration
      const tier = store.tier[idx] || 0;

      // Compute muzzle world position using local coords and ship transform
      const localX = store.localX[idx] * 32;
      const localY = store.localY[idx] * 32;
      const cos = Math.cos(xform.rotation);
      const sin = Math.sin(xform.rotation);

      const origin = {
        x: xform.position.x + localX * cos - localY * sin,
        y: xform.position.y + localX * sin + localY * cos,
      };

      // Acquire target within effective range (apply skill and passive multipliers)
      const targetShip = findRandomTargetInRange(
        ship,
        targetingRange * (laserRange + passiveRangeMultiplier),
      );
      if (!targetShip) continue;

      const targetPos = targetShip.getTransform().position;

      // Final damage calculation and color palette (tier-based)
      const dmg = (fireDamage + laserDamage) * damageBonus;
      const tierColour = LASER_TIER_COLORS_RGBA[tier] ?? [0.2, 0.9, 1.0, 1.0];

      // Fire beam (visual + damage application handled downstream)
      this.fireLaserBeam(
        origin,
        targetPos,
        targetShip,
        ship,
        dmg,
        tierColour,
        tier
      );

      // Optional chain-lightning behavior
      if (laserChain) {
        this.executeChainLightning(
          targetPos,
          targetShip,
          ship,
          dmg * 0.5,
          tierColour,
          tier,
          2, // default chain depth
        );
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Private Helper Methods
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Fires a single laser beam from origin to target position.
   * The visual beam still traces the real world path, but the damage model
   * now selects an eligible block from `targetShip` directly.
   */
  private fireLaserBeam(
    origin      : { x: number; y: number },
    targetPos   : { x: number; y: number },
    targetShip  : Ship,
    sourceShip  : Ship,
    damage      : number,
    tierColour  : [number, number, number, number],
    tier        : number,
  ): void {
    if (targetShip.isDestroyed()) return;

    const store = this.store;

    /* ── 1. Beam geometry (unchanged) ───────────────────────────────────────── */
    const dx   = targetPos.x - origin.x;
    const dy   = targetPos.y - origin.y;
    const mag  = Math.hypot(dx, dy) || 1;
    const dirX = dx / mag;
    const dirY = dy / mag;

    const extendedEnd = {
      x: targetPos.x + dirX * LASER_BEAM_EXTENSION_PX,
      y: targetPos.y + dirY * LASER_BEAM_EXTENSION_PX,
    };

    /* ── 2. Block selection (SOA, not BlockInstance) ────────────────────────── */
    // Get a random valid block index from the target ship
    let blockIndex = targetShip.getRandomBlockIndex();
    if (blockIndex == null || blockIndex === -1) {
      // Fallback: cockpit index (if ship still has one)
      blockIndex = targetShip.getCockpitIndex?.() ?? -1;
    }

    // Early exit if there are no blocks left
    if (blockIndex === -1) {
      spawnLaserBeam(origin.x, origin.y, extendedEnd.x, extendedEnd.y, tierColour);
      return;
    }

    // Derive local grid coordinate for damage/visuals
    const coord = { 
      x: store.localX[blockIndex], 
      y: store.localY[blockIndex] 
    };

    /* ── 3. Visual + SFX output (unchanged) ─────────────────────────────────── */
    spawnLaserBeam(origin.x, origin.y, extendedEnd.x, extendedEnd.y, tierColour);

    playSpatialSfx(targetShip, sourceShip, {
      file            : 'assets/sounds/sfx/magic/lightning_00.wav',
      channel         : 'sfx',
      baseVolume      : 0.8,
      pitchRange      : [0.8, 1.2],
      volumeJitter    : 0.1,
      maxSimultaneous : 5,
    });

    const sparkColor = BLOCK_TIER_COLORS[tier] ?? '#00FFFF';
    this.particleManager.emitBurst(targetPos, 16, {
      colors            : [sparkColor],
      randomDirection   : true,
      speedRange        : [360, 600],
      sizeRange         : [1.4, 2.4],
      lifeRange         : [0.4, 1.0],
      fadeOut           : true,
      light             : false,
    });

    createLightFlash(
      targetPos.x,
      targetPos.y,
      600,
      1.0,
      0.4,
      sparkColor,
      `laser-hit-${targetShip.id}`,
    );

    /* ── 4. Damage application (blockIndex, not BlockInstance) ──────────────── */
    this.combatService.applyDamageToBlock(
      targetShip,
      sourceShip,
      blockIndex,   // now block index, not a BlockInstance
      coord,        // local grid coord from BlockStore
      damage,
      'laser',
    );
  }

  /**
   * Executes chain lightning from the current target position.
   */
  private executeChainLightning(
    currentPos: { x: number; y: number },
    currentTarget: Ship,
    sourceShip: Ship,
    damage: number,
    tierColour: [number, number, number, number],
    tier: number,
    maxChains: number
  ): void {
    let chainCount = 0;
    let chainOrigin = { ...currentPos };
    let previousTarget = currentTarget;

    while (chainCount < maxChains) {
      // Find a new target within chain range
      const chainTarget = findRandomTargetInRange(
        currentTarget,
        CHAIN_RANGE_PX,
        previousTarget,
        currentTarget.getFaction()
      );

      // If no target found or we got the same target, stop chaining
      if (!chainTarget || chainTarget === previousTarget) {
        break;
      }

      const chainTargetPos = chainTarget.getTransform().position;

      // Fire the chain beam with reduced damage (75% of previous)
      const chainDamage = damage * 0.75;
      this.fireLaserBeam(
        chainOrigin,
        chainTargetPos,
        chainTarget,
        sourceShip,
        chainDamage,
        tierColour,
        tier
      );

      // Update for next potential chain
      chainOrigin = { ...chainTargetPos };
      previousTarget = chainTarget;
      chainCount++;
    }
  }

  /** Beam weapons are stateless: nothing to render during the render phase. */
  render(_: number): void { /* no-op */ }
}
