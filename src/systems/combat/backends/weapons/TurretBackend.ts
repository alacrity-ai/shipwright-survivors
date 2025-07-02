import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { WeaponFiringPlanEntry } from '@/systems/combat/types/WeaponTypes';
import { TURRET_COLOR_PALETTES } from '@/game/blocks/BlockColorSchemes';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { FiringMode, TurretClassId, TurretSequenceState } from '@/systems/combat/types/WeaponTypes';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

type TargetPoint = { x: number; y: number };

export class TurretBackend implements WeaponBackend {
  private fireSoundTimer: number = 0;
  private wasFiringLastFrame: boolean = false;

  constructor(
    private readonly projectileSystem: ProjectileSystem,
  ) {}

  public update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
    const plan = ship.getFiringPlan().filter(p =>
      p.block.type.metatags?.includes('turret') || p.block.type.metatags?.includes('cockpit')
    );
    if (plan.length === 0) return;

    const target = intent?.aimAt;
    const fireRequested = intent?.firePrimary ?? false;
    const mode = intent?.firingMode ?? FiringMode.Synced;
    this.fireSoundTimer++;

    // Affix bonus
    const { fireRateMulti = 1 } = ship.getAffixes();

    // Player passive bonus
    let fireRateBonus = ship.getPassiveBonus('turret-firing-rate');
    let damageBonus = ship.getPassiveBonus('turret-damage');
    const accuracyBonus = ship.getPassiveBonus('turret-accuracy');

    // Powerup bonuses
    const { fireRateMultiplier = 0, baseDamageMultiplier = 0 } = ship.getPowerupBonus();

    // Aggregate Bonus (Additive)
    fireRateBonus += fireRateMultiplier;
    damageBonus += baseDamageMultiplier;

    // Always advance cooldowns
    for (const turret of plan) {
      turret.timeSinceLastShot += dt;
    }

    // Detect if we just resumed firing after a pause
    const justResumedFiring = fireRequested && !this.wasFiringLastFrame;
    this.wasFiringLastFrame = fireRequested;

    if (!fireRequested || !target) return;

    const effectiveRate = fireRateMulti * fireRateBonus;

    if (mode === FiringMode.Synced) {
      this.handleSyncedFiring(plan, ship, transform, target, effectiveRate, damageBonus, accuracyBonus, dt);
    } else if (mode === FiringMode.Sequence) {
      this.handleSequenceFiring(plan, ship, transform, target, effectiveRate, damageBonus, accuracyBonus, dt, justResumedFiring);
    }
  }

  private handleSyncedFiring(
    plan: WeaponFiringPlanEntry[],
    ship: Ship,
    transform: BlockEntityTransform,
    target: TargetPoint,
    fireRateMulti: number,
    damageBonus: number,
    accuracyBonus: number,
    dt: number
  ): void {
    for (let i = plan.length - 1; i >= 0; i--) {
      const turret = plan[i];
      if (!ship.getBlockCoord(turret.block)) continue;

      if (turret.timeSinceLastShot < turret.fireCooldown / fireRateMulti) continue;

      this.spawnTurretProjectile(ship, transform, turret, target, damageBonus, accuracyBonus);
      turret.timeSinceLastShot = 0;
    }
  }

  private handleSequenceFiring(
    plan: WeaponFiringPlanEntry[],
    ship: Ship,
    transform: BlockEntityTransform,
    target: TargetPoint,
    fireRateMulti: number,
    damageBonus: number,
    accuracyBonus: number,
    dt: number,
    justResumedFiring: boolean
  ): void {
    const grouped = new Map<TurretClassId, WeaponFiringPlanEntry[]>();
    for (const entry of plan) {
      const id = entry.block.type.id;
      if (!grouped.has(id)) grouped.set(id, []);
      grouped.get(id)!.push(entry);
    }

    const sequenceState = ship['turretSequenceState'] as Record<TurretClassId, TurretSequenceState>;

    for (const [turretId, turrets] of grouped.entries()) {
      if (turrets.length === 0) continue;

      const rep = turrets[0];
      const effectiveCooldown = rep.fireCooldown / fireRateMulti;
      const interval = effectiveCooldown / turrets.length;

      let state = sequenceState[turretId];
      if (!state) {
        state = sequenceState[turretId] = { nextIndex: 0, lastFiredAt: interval };
      }

      if (justResumedFiring) {
        const readyTurret = turrets.find(t => t.timeSinceLastShot >= effectiveCooldown);
        if (readyTurret) {
          const readyIndex = turrets.indexOf(readyTurret);
          this.spawnTurretProjectile(ship, transform, readyTurret, target, damageBonus, accuracyBonus);
          readyTurret.timeSinceLastShot = 0;

          state.nextIndex = (readyIndex + 1) % turrets.length;
          state.lastFiredAt = 0;
          continue;
        }
      }

      state.lastFiredAt += dt;

      if (state.lastFiredAt >= interval) {
        const turret = turrets[state.nextIndex % turrets.length];
        if (!ship.getBlockCoord(turret.block)) continue;

        if (turret.timeSinceLastShot >= effectiveCooldown) {
          this.spawnTurretProjectile(ship, transform, turret, target, damageBonus, accuracyBonus);
          turret.timeSinceLastShot = 0;
          state.nextIndex = (state.nextIndex + 1) % turrets.length;
          state.lastFiredAt = 0;
        }
      }
    }
  }

private spawnTurretProjectile(
  ship: Ship,
  transform: BlockEntityTransform,
  turret: WeaponFiringPlanEntry,
  target: TargetPoint,
  damageBonus: number,
  accuracyBonus: number
): void {
  const { coord, block } = turret;

  const localX = coord.x * 32;
  const localY = coord.y * 32;
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  const worldX = transform.position.x + localX * cos - localY * sin;
  const worldY = transform.position.y + localX * sin + localY * cos;

  const fire = block.type.behavior!.fire!;
  const turretId = block.type.id;
  const particleColors = TURRET_COLOR_PALETTES[turretId] ?? TURRET_COLOR_PALETTES['turret0'];

  const dx = target.x - worldX;
  const dy = target.y - worldY;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return;

  // === Compute aim direction + spread
  let angle = Math.atan2(dy, dx);
  const spread = (1 - (fire.accuracy ?? 1) * accuracyBonus) * (Math.PI / 8);
  if (spread > 0) {
    angle += (Math.random() * 2 - 1) * spread;
  }

  const aimX = Math.cos(angle);
  const aimY = Math.sin(angle);
  let baseSpeed = fire.projectileSpeed ?? 300;

  // === Skilltree bonus
  const { turretProjectileSpeed = 0, turretSplitShots = false, turretPenetratingShots = false } = ship.getSkillEffects();
  baseSpeed += turretProjectileSpeed;

  // === Raw velocity with ship motion added
  const shipVel = transform.velocity;
  let vx = aimX * baseSpeed + shipVel.x;
  let vy = aimY * baseSpeed + shipVel.y;

  // === Clamp projected velocity to never go below baseSpeed along aim vector
  const projectedSpeed = vx * aimX + vy * aimY; // dot(finalVel, aimDir)
  if (projectedSpeed < baseSpeed) {
    const correction = baseSpeed - projectedSpeed;
    vx += aimX * correction;
    vy += aimY * correction;
  }

  // Add extra base damage from passive
  const { turretDamage = 0 } = ship.getSkillEffects();
  let baseDamage = fire.fireDamage! + turretDamage;

  if (this.fireSoundTimer > 4) {
    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    playSpatialSfx(ship, playerShip, {
      file: 'assets/sounds/sfx/weapons/turret_03.wav',
      channel: 'sfx',
      pitchRange: [0.7, 1.4],
      volumeJitter: 0.2,
      baseVolume: 1.0,
      maxSimultaneous: 10,
    });
    this.fireSoundTimer = 0;
  }

  this.projectileSystem.spawnProjectileWithVelocity(
    { x: worldX, y: worldY },
    { x: vx, y: vy },
    fire.fireType!,
    baseDamage * damageBonus,
    fire.lifetime ?? 2,
    1, // accuracy already applied
    ship.id,
    ship.getFaction(),
    particleColors,
    'delayed',
    turretSplitShots,
    turretPenetratingShots,
  );
}

  public render(dt: number): void {}
}
