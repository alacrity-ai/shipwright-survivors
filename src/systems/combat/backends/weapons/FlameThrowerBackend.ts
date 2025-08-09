// src/systems/combat/backends/FlameThrowerBackend.ts

import type { WeaponBackend } from '@/systems/combat/WeaponSystem';
import type { BlockEntityTransform } from '@/game/interfaces/types/BlockEntityTransform';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { CombatService } from '@/systems/combat/CombatService';

import type { BlockStore } from '@/game/blocks/system/BlockStore';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import { BlockSubcategoryEnum } from '@/game/interfaces/types/BlockType';

import { emitOrangeFlames, emitGreenFlames, emitBlueFlames, emitPurpleFlames } from '@/core/interfaces/events/SpecialFxReporter';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { Ship } from '@/game/ship/Ship';
import { emitDefaultFlames } from '@/core/interfaces/events/SpecialFxReporter';
import { Faction } from '@/game/interfaces/types/Faction';
import { FLAME_COLORS, TierToColorIndex } from '@/game/blocks/BlockColorSchemes';
import { FACTION_TO_INDEX } from '@/game/interfaces/types/Faction';

// SOA structure for flame projectiles
interface FlameProjectileSOA {
  count: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  damage: Float32Array;
  ttl: Float32Array;
  age: Float32Array;
  ownerShipId: Int32Array;    // int-mapped, no strings
  ownerFaction: Uint8Array;   // 0/1/2
  colorIndex: Uint8Array;     // enum-based color
  radiusMulti: Float32Array;
}

const MAX_FLAME_PROJECTILES = 2048;
const MAX_SPREAD_ANGLE = (30 * Math.PI) / 180;
const IGNITE_DURATION = 8.0;
const PROJECTILE_RADIUS = 92;
const BLOCK_SIZE = 32;

const FORWARD_OFFSET = 100;
const MAX_VISUAL_FLAMES_PER_FRAME = 16;
const LIGHT_BUDGET_PER_FRAME = 2;
const LIGHT_CHANCE = 0.3;
const DOT_BASE_DAMAGE = 1;
const DOT_TIER_BONUS = 0.5;

// Inner flame constants
const INNER_FLAME_DIRECTIONS = 12;
const INNER_FLAME_RADIUS = 200;

type FlameEmitterFn = (
  x: number,
  y: number,
  radius?: number,
  life?: number,
  light?: boolean,
  count?: number,
  vx?: number,
  vy?: number
) => void;


function createFlameSOABuffer(maxFlames: number): FlameProjectileSOA {
  return {
    count: 0,
    x: new Float32Array(maxFlames),
    y: new Float32Array(maxFlames),
    vx: new Float32Array(maxFlames),
    vy: new Float32Array(maxFlames),
    damage: new Float32Array(maxFlames),
    ttl: new Float32Array(maxFlames),
    age: new Float32Array(maxFlames),
    ownerShipId: new Int32Array(maxFlames),   // int IDs, no strings
    ownerFaction: new Uint8Array(maxFlames),  // 0/1/2 enum
    colorIndex: new Uint8Array(maxFlames),    // compact color index
    radiusMulti: new Float32Array(maxFlames),
  };
}

function swapFlame(soa: FlameProjectileSOA, i: number, j: number): void {
  // Swap all SOA fields between indices i and j
  let temp: number;

  temp = soa.x[i]; soa.x[i] = soa.x[j]; soa.x[j] = temp;
  temp = soa.y[i]; soa.y[i] = soa.y[j]; soa.y[j] = temp;
  temp = soa.vx[i]; soa.vx[i] = soa.vx[j]; soa.vx[j] = temp;
  temp = soa.vy[i]; soa.vy[i] = soa.vy[j]; soa.vy[j] = temp;
  temp = soa.damage[i]; soa.damage[i] = soa.damage[j]; soa.damage[j] = temp;
  temp = soa.ttl[i]; soa.ttl[i] = soa.ttl[j]; soa.ttl[j] = temp;
  temp = soa.age[i]; soa.age[i] = soa.age[j]; soa.age[j] = temp;
  temp = soa.ownerShipId[i]; soa.ownerShipId[i] = soa.ownerShipId[j]; soa.ownerShipId[j] = temp;
  temp = soa.ownerFaction[i]; soa.ownerFaction[i] = soa.ownerFaction[j]; soa.ownerFaction[j] = temp;
  temp = soa.colorIndex[i]; soa.colorIndex[i] = soa.colorIndex[j]; soa.colorIndex[j] = temp;
  temp = soa.radiusMulti[i]; soa.radiusMulti[i] = soa.radiusMulti[j]; soa.radiusMulti[j] = temp;
}

export class FlameThrowerBackend implements WeaponBackend {
  private readonly soa: FlameProjectileSOA;
  private readonly freeIndices: number[] = [];

  private store: BlockStore;

  private innerFlameTimeSinceLastShot: number = 0;

  private readonly flameMethodMap: Record<number, FlameEmitterFn> = {
    1: emitOrangeFlames,
    2: emitGreenFlames,
    3: emitBlueFlames,
    4: emitPurpleFlames,
  };

  constructor(
    private readonly combatService: CombatService,
  ) {
    this.store = BlockManager.getInstance().getBlockStore();
    this.soa = createFlameSOABuffer(MAX_FLAME_PROJECTILES);
  }

  update(dt: number, ship: Ship, transform: BlockEntityTransform, intent: WeaponIntent | null): void {
    const store = this.store;

    // Filter firing plan to only flame thrower blocks using SOA subcategory code
    const plan = ship.getFiringPlan().filter(entry => 
      store.subcategoryCode[entry.blockIndex] === BlockSubcategoryEnum.FlameThrower
    );

    if (plan.length === 0 || !intent?.firePrimary) return;

    const { 
      flameThrowerSize = 0,
      innerFlame = false,
    } = ship.getSkillEffects();

    if (!innerFlame && !intent.aimAt) return;

    // Compute average tier for DOT scaling using store.tier[]
    let tierSum = 0;
    for (let i = 0; i < plan.length; i++) {
      const idx = plan[i].blockIndex;
      tierSum += store.tier[idx] ?? 0;
    }
    const avgTier = tierSum / plan.length;
    const dotMultiplier = DOT_BASE_DAMAGE * plan.length + DOT_TIER_BONUS * avgTier + ship.getDamageMultiplier();

    // Determine highest-tier turret for stat scaling (fire stats and color index)
    let totalBlockDamage = 0;
    let maxTier = -Infinity;
    let highestTierIdx = -1;

    for (let i = 0; i < plan.length; i++) {
      const idx = plan[i].blockIndex;

      totalBlockDamage += store.fireDamage[idx] ?? 1;

      const tier = store.tier[idx] ?? 0;
      if (tier > maxTier) {
        maxTier = tier;
        highestTierIdx = idx; // We'll read its fire stats below
      }
    }

    // Resolve stats from the highest-tier block
    const chosenColorIndex = TierToColorIndex[maxTier] ?? TierToColorIndex[0];

    // Pull stats directly from SOA
    const sampleFireRate = store.fireRate[highestTierIdx] ?? 8.0;
    const sampleSpeed = store.projectileSpeed[highestTierIdx] ?? 700;
    const sampleLifetime = store.projectileLifetime[highestTierIdx] ?? 0.5;
    const sampleRadius = PROJECTILE_RADIUS;

    // === Light and inner flame handling ===
    let lightBudget = innerFlame ? 8 : LIGHT_BUDGET_PER_FRAME;
    let hasLight = false;
    
    const emitMethod = this.flameMethodMap[maxTier] ?? emitOrangeFlames;

    if (innerFlame) {
      this.innerFlameTimeSinceLastShot ??= 0;
      this.innerFlameTimeSinceLastShot += dt;

      if (this.innerFlameTimeSinceLastShot < (1.0 / sampleFireRate)) {
        this.updateFlames(dt, ship);
        return; // Too soon to fire again
      }
      this.innerFlameTimeSinceLastShot = 0;

      const shipTransform = ship.getTransform();
      const centerX = shipTransform.position.x;
      const centerY = shipTransform.position.y;

      const baseAngleOffset = Math.random() * 2 * Math.PI;
      const color = FLAME_COLORS[chosenColorIndex];

      // Scale total DPS across all projectiles in the ring
      const totalDamage = totalBlockDamage * dotMultiplier;
      const damagePerProj = totalDamage / INNER_FLAME_DIRECTIONS;

      for (let i = 0; i < INNER_FLAME_DIRECTIONS; i++) {
        const angle = baseAngleOffset + (i / INNER_FLAME_DIRECTIONS) * 2 * Math.PI;

        const spawnX = centerX + Math.cos(angle) * INNER_FLAME_RADIUS;
        const spawnY = centerY + Math.sin(angle) * INNER_FLAME_RADIUS;

        let vx = Math.cos(angle) * sampleSpeed;
        let vy = Math.sin(angle) * sampleSpeed;
        vx += shipTransform.velocity.x;
        vy += shipTransform.velocity.y;

        const attachLight = lightBudget > 0 && (lightBudget === 8 || Math.random() < LIGHT_CHANCE);
        if (attachLight) lightBudget--;

        emitMethod(
          spawnX,
          spawnY,
          sampleRadius * (1 + flameThrowerSize),
          sampleLifetime,
          attachLight,
          4,
          vx * 1.25,
          vy * 1.25
        );

        this.addFlameProjectile(
          spawnX,
          spawnY,
          vx,
          vy,
          damagePerProj,              // Spread total damage across projectiles
          sampleLifetime * 0.5,       // Half-lifetime for projectile instance
          ship.numericId,
          ship.getFaction(),
          chosenColorIndex,
          1 + flameThrowerSize
        );
      }

      this.updateFlames(dt, ship);
      return; // Skip standard turret logic
    }

    // Handle NORMAL (non-innerFlame) flamethrowers
    for (const flame of plan) {
      const idx = flame.blockIndex;

      // Pull all required stats directly from SOA
      const fireRate = store.fireRate[idx] ?? 8.0;
      const speed = store.projectileSpeed[idx] ?? 700;
      const ttl = store.projectileLifetime[idx] ?? 0.5;
      const radius = PROJECTILE_RADIUS;
      const fireDamage = store.fireDamage[idx] ?? 1;
      const tier = store.tier[idx] ?? 0;

      // Fire-rate cooldown
      flame.timeSinceLastShot += dt;
      if (flame.timeSinceLastShot < (1.0 / fireRate)) continue;
      flame.timeSinceLastShot = 0;

      // Resolve color and aim
      const colorIndex = TierToColorIndex[tier] ?? TierToColorIndex[0];
      const color = FLAME_COLORS[colorIndex];
      const aimAt = intent.aimAt!;
      const dx = aimAt.x - transform.position.x;
      const dy = aimAt.y - transform.position.y;
      const baseAngle = Math.atan2(dy, dx);

      const cos = Math.cos(transform.rotation);
      const sin = Math.sin(transform.rotation);

      // Prefer cached coord, otherwise read from SOA
      const coord = flame.coord ?? { x: store.localX[idx], y: store.localY[idx] };

      const localX = coord.x * BLOCK_SIZE;
      const localY = coord.y * BLOCK_SIZE;
      const worldX = transform.position.x + localX * cos - localY * sin;
      const worldY = transform.position.y + localX * sin + localY * cos;

      const angleOffset = (Math.random() - 0.5) * 2 * MAX_SPREAD_ANGLE * (1 + flameThrowerSize);
      const finalAngle = baseAngle + angleOffset;

      let vx = Math.cos(finalAngle) * speed;
      let vy = Math.sin(finalAngle) * speed;
      vx += transform.velocity.x;
      vy += transform.velocity.y;

      const spawnX = worldX + Math.cos(finalAngle) * FORWARD_OFFSET;
      const spawnY = worldY + Math.sin(finalAngle) * FORWARD_OFFSET;

      if (lightBudget > 0) {
        if (lightBudget === LIGHT_BUDGET_PER_FRAME) {
          hasLight = true;
          lightBudget--;
        } else if (Math.random() < LIGHT_CHANCE) {
          hasLight = true;
          lightBudget--;
        }
      }

      emitMethod(
        spawnX,
        spawnY,
        radius * (1 + flameThrowerSize),
        ttl,
        hasLight,
        4,
        vx,
        vy
      );

      this.addFlameProjectile(
        spawnX,
        spawnY,
        vx,
        vy,
        fireDamage * dotMultiplier,
        ttl * 0.5,
        ship.numericId,
        ship.getFaction(),
        colorIndex,
        1 + flameThrowerSize
      );

      // Emit visual-only flame bursts for aesthetics
      const visualFlamesPerTurret = Math.max(1, Math.floor(MAX_VISUAL_FLAMES_PER_FRAME / plan.length));
      for (let i = 0; i < visualFlamesPerTurret; i++) {
        const sizeJitter = radius * (1 + flameThrowerSize) * (0.5 + Math.random() * 0.5);
        const lifeJitter = ttl * (0.6 + Math.random() * 0.5);
        const angleJitter = finalAngle + (Math.random() - 0.5) * 0.15;

        let vjx = Math.cos(angleJitter) * (speed * 0.8);
        let vjy = Math.sin(angleJitter) * (speed * 0.8);
        vjx += transform.velocity.x;
        vjy += transform.velocity.y;

        emitDefaultFlames(
          spawnX,
          spawnY,
          sizeJitter,
          lifeJitter,
          false,
          3,
          color,
          vjx,
          vjy
        );
      }

      hasLight = false;
    }

    this.updateFlames(dt, ship);
  }

  private addFlameProjectile(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    ttl: number,
    ownerShipIntId: number,    // int-mapped ship ID
    ownerFaction: Faction,
    colorIndex: number,        // compact index for FLAME_COLORS
    radiusMulti: number
  ): number {
    const idx = this.allocateIndex();
    if (idx === -1) return -1; // No space available

    this.soa.x[idx] = x;
    this.soa.y[idx] = y;
    this.soa.vx[idx] = vx;
    this.soa.vy[idx] = vy;
    this.soa.damage[idx] = damage;
    this.soa.ttl[idx] = ttl;
    this.soa.age[idx] = 0;
    this.soa.ownerShipId[idx] = ownerShipIntId;
    this.soa.ownerFaction[idx] = FACTION_TO_INDEX[ownerFaction] ?? 0;
    this.soa.colorIndex[idx] = colorIndex;
    this.soa.radiusMulti[idx] = radiusMulti;

    return idx;
  }

  private updateFlames(dt: number, ownerShip: Ship): void {
    const { flameThrowerCriticalChance = 0, endlessIgnition = false } = ownerShip.getSkillEffects();
    const grid = BlockManager.getInstance().getBlockSpatialGrid();
    const store = this.store;

    for (let i = 0; i < this.soa.count; ) {
      this.soa.age[i] += dt;

      if (this.soa.age[i] > this.soa.ttl[i]) {
        this.recycleFlame(i);
        continue; // Swapped with last, so don't increment
      }

      // Move projectile
      const x = (this.soa.x[i] += this.soa.vx[i] * dt);
      const y = (this.soa.y[i] += this.soa.vy[i] * dt);

      const projectileOwnerInt = this.soa.ownerShipId[i];
      const projectileFaction = this.soa.ownerFaction[i];
      const effectiveRadius = PROJECTILE_RADIUS * (1 + this.soa.radiusMulti[i]);
      const radiusSq = effectiveRadius * effectiveRadius;

      // Broad-phase query for nearby block indices
      const hits = grid.getBlocksInArea(
        x - effectiveRadius,
        y - effectiveRadius,
        x + effectiveRadius,
        y + effectiveRadius
      );

      let hitSomething = false;

      for (let h = 0; h < hits.length; h++) {
        const blockIdx = hits[h];

        // Skip same ship and same faction (prevents self and ally ignition)
        if (store.ownerShipId[blockIdx] === projectileOwnerInt) continue;
        if (store.ownerFaction[blockIdx] === projectileFaction) continue;

        const bx = store.worldX[blockIdx];
        const by = store.worldY[blockIdx];
        const dx = x - bx;
        const dy = y - by;
        if (dx * dx + dy * dy >= radiusSq) continue;

        // Resolve owning ship and grid coordinates without legacy utils
        const targetShip = ShipRegistry.getInstance().getByNumericId(store.ownerShipId[blockIdx]);
        if (!targetShip || targetShip.isNoClip()) continue;

        const coord = { x: store.localX[blockIdx], y: store.localY[blockIdx] };

        if (targetShip instanceof Ship) {
          targetShip.addStatusEffect(
            'ignite',
            endlessIgnition ? 120 : IGNITE_DURATION,
            ownerShip,
            this.soa.damage[i]
          );
        }

        this.combatService.applyDamageToBlock(
          targetShip,
          ownerShip,
          blockIdx,                // SOA index
          coord,                   // local grid coord for effects
          this.soa.damage[i] * 0.5,
          'dot',
          true,
          1 + flameThrowerCriticalChance
        );

        hitSomething = true;
        break;
      }

      if (hitSomething) {
        this.recycleFlame(i);
        continue; // Recycled, so don't increment
      }

      i++; // Only increment if not recycled
    }
  }

  private recycleFlame(index: number): void {
    const lastIndex = this.soa.count - 1;
    
    if (index !== lastIndex) {
      swapFlame(this.soa, index, lastIndex);
    }
    
    this.freeIndices.push(lastIndex);
    this.soa.count--;
  }

  private allocateIndex(): number {
    if (this.freeIndices.length > 0) {
      const idx = this.freeIndices.pop()!;
      if (idx >= this.soa.count) {
        this.soa.count = idx + 1;
      }
      return idx;
    }
    
    if (this.soa.count >= MAX_FLAME_PROJECTILES) return -1;
    return this.soa.count++;
  }

  render(dt: number): void {
    // All visuals handled by emitDefaultFlames
  }

  // Utility methods for debugging/monitoring
  public getActiveFlameCount(): number {
    return this.soa.count;
  }

  // Clean up method for when the backend is destroyed
  public destroy(): void {
    this.soa.count = 0;
    this.freeIndices.length = 0;

    // Clear all SOA fields for GC friendliness
    this.soa.x.fill(0);
    this.soa.y.fill(0);
    this.soa.vx.fill(0);
    this.soa.vy.fill(0);
    this.soa.damage.fill(0);
    this.soa.ttl.fill(0);
    this.soa.age.fill(0);
    this.soa.ownerShipId.fill(0);     // now Int32Array, not string[]
    this.soa.ownerFaction.fill(0);
    this.soa.colorIndex.fill(0);      // now numeric color index
    this.soa.radiusMulti.fill(0);
  }
}