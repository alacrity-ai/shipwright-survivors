// // ────────────────────────────────────────────────────────────────────────────────
// // src/systems/combat/backends/weapons/LaserBackend.ts
// // ────────────────────────────────────────────────────────────────────────────────
// /**
//  * Instant-hit laser implementation.
//  *
//  * This backend traverses all blocks whose `behavior.fire.fireType === 'laser'`
//  * and, when a firing intent is present, performs the following pipeline:
//  *
//  *  1.  Compute world-space muzzle position for the block.
//  *  2.  Select an eligible target ship with `findRandomTargetInRange`.
//  *  3.  Ray-march through the spatial `Grid` to acquire the first occluding block.
//  *  4.  Emit the laser-beam visual via `spawnLaserBeam`.
//  *  5.  Inflict immediate damage on the impacted block.
//  *
//  * Beam weapons are *state-less* once fired; therefore the backend maintains no
//  * persistent projectile list—contrasting with HeatSeeker or Turret backends.
//  *
//  * Design notes
//  * ------------
//  * • The class is deliberately free of *render-phase* responsibilities; the
//  *   visual artifact is delegated to `spawnLaserBeam`, which itself manages the beam
//  * • All tunable statistics (cool-down, damage, range, colour, etc.) are pulled
//  *   from the block definition and then optionally modulated by ship passives /
//  *   power-ups, ensuring a single source-of-truth for balance data.
//  */

// import type { WeaponBackend }          from '@/systems/combat/WeaponSystem';
// import type { Ship }                   from '@/game/ship/Ship';
// import type { BlockEntityTransform }   from '@/game/interfaces/types/BlockEntityTransform';
// import type { WeaponIntent }           from '@/core/intent/interfaces/WeaponIntent';
// import type { CombatService }          from '@/systems/combat/CombatService';
// import type { ParticleManager }        from '@/systems/fx/ParticleManager';
// import type { Grid }                   from '@/systems/physics/Grid';
// import type { ShipSkillEffectMetadata } from '@/game/ship/skills/interfaces/ShipSkillEffectMetadata';

// import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
// import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';

// import { findRandomTargetInRange }     from '@/systems/ai/helpers/ShipUtils';
// import { spawnLaserBeam }              from '@/systems/fx/helpers/boltSpawners';

// const LASER_BEAM_EXTENSION_PX = 80;

// /** Helper colour palette keyed by block tier (fallback: cyan). */
// import { BLOCK_TIER_COLORS_RGBA, BLOCK_TIER_COLORS }           from '@/game/blocks/BlockColorSchemes';

// export class LaserBackend implements WeaponBackend {

//   private skillEffects: ShipSkillEffectMetadata = {};

//   // ═════════════════════════════════════════════════════════════════════════════
//   // Construction
//   // ═════════════════════════════════════════════════════════════════════════════
//   constructor(
//     private readonly combatService : CombatService,
//     private readonly particleManager: ParticleManager,
//     private readonly grid          : Grid,
//   ) {
//     this.skillEffects = PlayerShipCollection.getInstance().getSkillEffectsForActiveShip();
//   }

//   // ═════════════════════════════════════════════════════════════════════════════
//   // Public API
//   // ═════════════════════════════════════════════════════════════════════════════
//   /**
//    * Main per-frame hook driven by `WeaponSystem`.
//    */
//   update(
//     dt       : number,
//     ship     : Ship,
//     xform    : BlockEntityTransform,
//     intent   : WeaponIntent | null,
//   ): void {

//     // ─── Short-circuit: no firing intent ───────────────────────────────────────
//     if (!intent?.firePrimary) return;

//     // ─── Extract candidate laser blocks (fireType === 'laser') ────────────────
//     const firingPlan = ship
//       .getFiringPlan()
//       .filter(p => p.block.type.behavior?.fire?.fireType === 'laser');

//     if (firingPlan.length === 0) return;

//     console.log('[LaserBackend] Found firing plan for ', firingPlan.length, ' laser emitters.');

//     // ─── Passive / power-up modifiers ─────────────────────────────────────────
//     let fireRateBonus   = 1.0; // TODO: Temporary
//     let damageBonus     = ship.getPassiveBonus('laser-damage');
//     const { fireRateMultiplier = 0, baseDamageMultiplier = 0 } = ship.getPowerupBonus();
//     fireRateBonus   += fireRateMultiplier;
//     damageBonus     += baseDamageMultiplier;

//     // Skill effects
//     const canChain = this.skillEffects.laserChain ?? false;
//     const canAreaOfEffect = this.skillEffects.laserAreaOfEffect ?? false;

//     // ========================================================================
//     // Iterate over each laser emitter block
//     // ========================================================================
//     for (const emitter of firingPlan) {
//       const fireDef = emitter.block.type.behavior!.fire!;

//       // Cool-down gate
//       emitter.timeSinceLastShot += dt;
//       if (emitter.timeSinceLastShot < emitter.fireCooldown / fireRateBonus) continue;
//       emitter.timeSinceLastShot = 0;

//       // ─── World-space muzzle coordinates ────────────────────────────────────
//       const { x: cx, y: cy } = emitter.coord;       // grid coord (in tiles)
//       const localX = cx * 32;                       // convert to pixels
//       const localY = cy * 32;

//       const cos = Math.cos(xform.rotation);
//       const sin = Math.sin(xform.rotation);

//       const origin = {
//         x: xform.position.x + localX * cos - localY * sin,
//         y: xform.position.y + localX * sin + localY * cos,
//       };

//       // ─── Target acquisition ───────────────────────────────────────────────────
//       const targetShip = findRandomTargetInRange(
//         ship,
//         fireDef.targetingRange ?? 1_200,
//       );
//       if (!targetShip) continue;

//       const targetPos = targetShip.getTransform().position;

//       // ─── Extend ray past the nominal end-point ────────────────────────────────
//       const dx   = targetPos.x - origin.x;
//       const dy   = targetPos.y - origin.y;
//       const mag  = Math.hypot(dx, dy) || 1;           // guard against 0-length
//       const dirX = dx / mag;
//       const dirY = dy / mag;

//       const extendedEnd = {
//         x: targetPos.x + dirX * LASER_BEAM_EXTENSION_PX,
//         y: targetPos.y + dirY * LASER_BEAM_EXTENSION_PX,
//       };

//       // ─── Raycast for first impacted block ─────────────────────────────────────
//       let hit = this.grid.getFirstBlockAlongRay(
//         origin,
//         extendedEnd,
//         ship.getFaction(),
//       );

//       // Fallback to a randomblock
//       if (!hit) {
//         hit = {
//           block: targetShip.getRandomBlock()!,
//           point: targetPos,
//         };
//       }

//       // ─── Visual: laser beam emission ──────────────────────────────────────────
//       const tierColour =
//         BLOCK_TIER_COLORS_RGBA[emitter.block.type.tier] ?? [0.2, 0.9, 1.0, 1.0];

//       spawnLaserBeam(
//         origin.x,
//         origin.y,
//         extendedEnd.x,
//         extendedEnd.y,
//         tierColour,
//       );

//       // SoundFx
//       playSpatialSfx(targetShip, ship, {
//         file: 'assets/sounds/sfx/magic/lightning_00.wav',
//         channel: 'sfx',
//         baseVolume: 0.8,
//         pitchRange: [0.8, 1.2],
//         volumeJitter: 0.1,
//         maxSimultaneous: 5,
//       });

//       // ─── Damage application ────────────────────────────────────────────────
//       const dmg = (fireDef.fireDamage ?? 1) * damageBonus;
//       const targetShipCoord = targetShip.getBlockCoord(hit.block);
//       const sparkColors = BLOCK_TIER_COLORS[emitter.block.type.tier] ?? '#00FFFFF';

//       // Particle Emission at TargetShip
//       this.particleManager.emitBurst(targetPos, 16, {
//         colors: [sparkColors],
//         randomDirection: true,
//         speedRange: [360, 600],
//         sizeRange: [1.4, 2.4],
//         lifeRange: [0.4, 1.0],
//         fadeOut: true,
//         light: true,
//         lightRadiusScalar: 60,
//         lightIntensity: 0.2,
//       });

//       if (!targetShipCoord) continue;

//       this.combatService.applyDamageToBlock(
//         targetShip,
//         ship,
//         hit.block,
//         targetShipCoord,
//         dmg,
//         'laser',
//       );
//     }
//   }

//   /** Beam weapons are stateless: nothing to render during the render phase. */
//   render(_: number): void { /* no-op */ }
// }


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
import type { Grid }                   from '@/systems/physics/Grid';
import type { ShipSkillEffectMetadata } from '@/game/ship/skills/interfaces/ShipSkillEffectMetadata';

import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';

import { findRandomTargetInRange }     from '@/systems/ai/helpers/ShipUtils';
import { spawnLaserBeam }              from '@/systems/fx/helpers/boltSpawners';

const LASER_BEAM_EXTENSION_PX = 80;
const CHAIN_RANGE_PX = 1500; // Range to search for chain targets

/** Helper colour palette keyed by block tier (fallback: cyan). */
import { BLOCK_TIER_COLORS_RGBA, BLOCK_TIER_COLORS }           from '@/game/blocks/BlockColorSchemes';

export class LaserBackend implements WeaponBackend {

  private skillEffects: ShipSkillEffectMetadata = {};

  // ═════════════════════════════════════════════════════════════════════════════
  // Construction
  // ═════════════════════════════════════════════════════════════════════════════
  constructor(
    private readonly combatService : CombatService,
    private readonly particleManager: ParticleManager,
    private readonly grid          : Grid,
  ) {
    this.skillEffects = PlayerShipCollection.getInstance().getSkillEffectsForActiveShip();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Public API
  // ═════════════════════════════════════════════════════════════════════════════
  /**
   * Main per-frame hook driven by `WeaponSystem`.
   */
  update(
    dt       : number,
    ship     : Ship,
    xform    : BlockEntityTransform,
    intent   : WeaponIntent | null,
  ): void {

    // ─── Short-circuit: no firing intent ───────────────────────────────────────
    if (!intent?.firePrimary) return;

    // ─── Extract candidate laser blocks (fireType === 'laser') ────────────────
    const firingPlan = ship
      .getFiringPlan()
      .filter(p => p.block.type.behavior?.fire?.fireType === 'laser');

    if (firingPlan.length === 0) return;

    // ─── Passive / power-up modifiers ─────────────────────────────────────────
    let fireRateBonus   = 1.0; // TODO: Temporary
    let damageBonus     = ship.getPassiveBonus('laser-damage');
    const { fireRateMultiplier = 0, baseDamageMultiplier = 0 } = ship.getPowerupBonus();
    fireRateBonus   += fireRateMultiplier;
    damageBonus     += baseDamageMultiplier;

    // Skill effects
    const canChain = this.skillEffects.laserChain ?? false;
    const canAreaOfEffect = this.skillEffects.laserAreaOfEffect ?? false;

    // ========================================================================
    // Iterate over each laser emitter block
    // ========================================================================
    for (const emitter of firingPlan) {
      const fireDef = emitter.block.type.behavior!.fire!;

      // Cool-down gate
      emitter.timeSinceLastShot += dt;
      if (emitter.timeSinceLastShot < emitter.fireCooldown / fireRateBonus) continue;
      emitter.timeSinceLastShot = 0;

      // ─── World-space muzzle coordinates ────────────────────────────────────
      const { x: cx, y: cy } = emitter.coord;       // grid coord (in tiles)
      const localX = cx * 32;                       // convert to pixels
      const localY = cy * 32;

      const cos = Math.cos(xform.rotation);
      const sin = Math.sin(xform.rotation);

      const origin = {
        x: xform.position.x + localX * cos - localY * sin,
        y: xform.position.y + localX * sin + localY * cos,
      };

      // ─── Target acquisition ───────────────────────────────────────────────────
      const targetShip = findRandomTargetInRange(
        ship,
        fireDef.targetingRange ?? 1_200,
      );
      if (!targetShip) continue;

      const targetPos = targetShip.getTransform().position;

      // ─── Fire the initial laser beam ──────────────────────────────────────────
      const dmg = (fireDef.fireDamage ?? 1) * damageBonus;
      const tierColour = BLOCK_TIER_COLORS_RGBA[emitter.block.type.tier] ?? [0.2, 0.9, 1.0, 1.0];
      
      this.fireLaserBeam(
        origin,
        targetPos,
        targetShip,
        ship,
        dmg,
        tierColour,
        emitter.block.type.tier
      );

      // ─── Chain lightning if skill is active ───────────────────────────────────
      if (canChain) {
        this.executeChainLightning(
          targetPos,
          targetShip,
          ship,
          dmg * 0.5,
          tierColour,
          emitter.block.type.tier,
          2 // Maximum 2 chains
        );
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Private Helper Methods
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Fires a single laser beam from origin to target position.
   */
  private fireLaserBeam(
    origin: { x: number; y: number },
    targetPos: { x: number; y: number },
    targetShip: Ship,
    sourceShip: Ship,
    damage: number,
    tierColour: [number, number, number, number],
    tier: number
  ): void {
    // ─── Extend ray past the nominal end-point ────────────────────────────────
    const dx   = targetPos.x - origin.x;
    const dy   = targetPos.y - origin.y;
    const mag  = Math.hypot(dx, dy) || 1;           // guard against 0-length
    const dirX = dx / mag;
    const dirY = dy / mag;

    const extendedEnd = {
      x: targetPos.x + dirX * LASER_BEAM_EXTENSION_PX,
      y: targetPos.y + dirY * LASER_BEAM_EXTENSION_PX,
    };

    // ─── Raycast for first impacted block ─────────────────────────────────────
    let hit = this.grid.getFirstBlockAlongRay(
      origin,
      extendedEnd,
      sourceShip.getFaction(),
    );

    // Fallback to a random block
    if (!hit) {
      hit = {
        block: targetShip.getRandomBlock()!,
        point: targetPos,
      };
    }

    // ─── Visual: laser beam emission ──────────────────────────────────────────
    spawnLaserBeam(
      origin.x,
      origin.y,
      extendedEnd.x,
      extendedEnd.y,
      tierColour,
    );

    // SoundFx
    playSpatialSfx(targetShip, sourceShip, {
      file: 'assets/sounds/sfx/magic/lightning_00.wav',
      channel: 'sfx',
      baseVolume: 0.8,
      pitchRange: [0.8, 1.2],
      volumeJitter: 0.1,
      maxSimultaneous: 5,
    });

    // ─── Damage application ────────────────────────────────────────────────
    const targetShipCoord = targetShip.getBlockCoord(hit.block);
    const sparkColors = BLOCK_TIER_COLORS[tier] ?? '#00FFFFF';

    // Particle Emission at TargetShip
    this.particleManager.emitBurst(targetPos, 16, {
      colors: [sparkColors],
      randomDirection: true,
      speedRange: [360, 600],
      sizeRange: [1.4, 2.4],
      lifeRange: [0.4, 1.0],
      fadeOut: true,
      light: true,
      lightRadiusScalar: 60,
      lightIntensity: 0.2,
    });

    if (!targetShipCoord) return;

    this.combatService.applyDamageToBlock(
      targetShip,
      sourceShip,
      hit.block,
      targetShipCoord,
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