// src/game/boss/ai/mechanics/mechs/DirectionalFlameThrowerMechanic.ts

import type { BaseBossMechanic } from '../BaseBossMechanic';
import type { Ship } from '@/game/ship/Ship';
import type { CombatService } from '@/systems/combat/CombatService';

import { emitDefaultFlames } from '@/core/interfaces/events/SpecialFxReporter';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { BossManager } from '@/game/boss/BossManager';

const DAMAGE_PER_TICK = 10;

export class DirectionalFlameThrowerMechanic implements BaseBossMechanic {
  public name = 'DirectionalFlameThrower';

  private elapsed = 0;
  private readonly duration: number;
  private finished = false;

  private arcStartDeg: number;
  private arcEndDeg: number;
  private arcStartRad: number;
  private arcEndRad: number;

  private readonly combatService: CombatService;
  private readonly playerShip: Ship | null;
  private readonly damageMultiplier: number;

  private lastEmitTime = 0;
  private readonly emitInterval = 0.1;

  private readonly flameDistance = 300;
  private readonly flameSpeed = 1200;
  private readonly flameRadius = 128;
  private readonly flameLifetime = 2.2;
  private readonly flameCount = 1;
  private readonly flameColor = '#ff9933';
  private readonly numEmitters = 16;

  constructor(
    private readonly ship: Ship,
    arcStartDeg: number,
    arcEndDeg: number,
    duration: number,
    damageMultiplier: number
  ) {
    this.arcStartDeg = arcStartDeg;
    this.arcEndDeg = arcEndDeg;
    this.arcStartRad = arcStartDeg * Math.PI / 180;
    this.arcEndRad = arcEndDeg * Math.PI / 180;
    this.duration = duration;
    this.damageMultiplier = damageMultiplier;

    this.combatService = BossManager.getInstance().getCombatService();
    this.playerShip = ShipRegistry.getInstance().getPlayerShip();
  }

  public start(): void {
    console.log('[FlameThrower] START');
    console.log(`→ Arc: ${this.arcStartDeg}° → ${this.arcEndDeg}°`);
    console.log(`→ Duration: ${this.duration}s`);
  }

  public update(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.finished = true;
      return;
    }

    this.lastEmitTime += dt;
    if (this.lastEmitTime < this.emitInterval) return;
    this.lastEmitTime = 0;

    const transform = this.ship.getTransform();
    const centerX = transform.position.x;
    const centerY = transform.position.y;

    // Normalize arc span across wraparound
    let arcSpan = this.arcEndRad - this.arcStartRad;
    if (arcSpan < 0) {
      arcSpan += Math.PI * 2;
    }

    const step = this.numEmitters > 1 ? arcSpan / (this.numEmitters - 1) : 0;

    for (let i = 0; i < this.numEmitters; i++) {
      const angleRad = this.arcStartRad + step * i;
      const adjustedRad = angleRad - Math.PI / 2;

      const fxX = centerX + Math.cos(adjustedRad) * this.flameDistance;
      const fxY = centerY + Math.sin(adjustedRad) * this.flameDistance;

      const vx = Math.cos(adjustedRad) * this.flameSpeed + transform.velocity.x;
      const vy = Math.sin(adjustedRad) * this.flameSpeed + transform.velocity.y;

      emitDefaultFlames(
        fxX,
        fxY,
        this.flameRadius,
        this.flameLifetime,
        true, // attach light
        this.flameCount,
        this.flameColor,
        vx,
        vy
      );
    }

    // Do damage to playership if they are within the radius
    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    if (!playerShip) return;
    const playerTransform = playerShip.getTransform();
    const { x: playerX, y: playerY } = playerTransform.position;

const dx = playerX - centerX;
const dy = playerY - centerY;
let angleToPlayer = Math.atan2(dy, dx);
if (angleToPlayer < 0) angleToPlayer += Math.PI * 2;

// Correct the arc by rotating it clockwise 90° (−π/2)
let arcStart = (this.arcStartRad - Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
let arcEnd = (this.arcEndRad - Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);

let isPlayerHit = false;
if (arcStart <= arcEnd) {
  isPlayerHit = angleToPlayer >= arcStart && angleToPlayer <= arcEnd;
} else {
  // Arc wraps around 2π
  isPlayerHit = angleToPlayer >= arcStart || angleToPlayer <= arcEnd;
}


    if (isPlayerHit) {
      const damage = DAMAGE_PER_TICK * this.damageMultiplier;
      this.combatService.applyDamageToRandomBlock(
        playerShip,
        this.ship,
        damage,
        'projectile'
      );  
    }
  }

  public updateArc(newStartDeg: number, newEndDeg: number): void {
    this.arcStartDeg = newStartDeg;
    this.arcEndDeg = newEndDeg;
    this.arcStartRad = newStartDeg * Math.PI / 180;
    this.arcEndRad = newEndDeg * Math.PI / 180;

    console.log(`[FlameThrower] Arc updated → ${newStartDeg.toFixed(2)}° → ${newEndDeg.toFixed(2)}°`);
  }

  public isFinished(): boolean {
    return this.finished;
  }

  public cleanup(): void {
    console.log('[FlameThrower] CLEANUP after', this.elapsed.toFixed(2), 'seconds');
  }
}
