// src/game/boss/ai/mechanics/mechs/RadialExplosionMechanic.ts

import type { BaseBossMechanic } from '../BaseBossMechanic';
import type { Ship } from '@/game/ship/Ship';
import type { CombatService } from '@/systems/combat/CombatService';


import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { playSpatialSfx } from '@/audio/utils/playSpatialSfx';
import { emitDefaultFlames } from '@/core/interfaces/events/SpecialFxReporter';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { BossManager } from '@/game/boss/BossManager';

const EXPLOSION_DAMAGE = 10;
const EXPLOSION_RADIUS = 1800;
const EXPLOSION_OFFSET = 128;
const NUM_DIRECTIONS = 32;

export class RadialExplosionMechanic implements BaseBossMechanic {
  public name = 'RadialExplosion';

  private readonly ship: Ship;
  private readonly duration: number;
  private readonly damageMultiplier: number;

  private readonly flameSpeed = 1400;
  private readonly flameRadius = 356;
  private readonly flameLifetime = 1.5;
  private readonly flameColor = '#ff4444';
  private readonly numEmitters = NUM_DIRECTIONS;

  private readonly combatService: CombatService;
  private readonly playerShip: Ship | null;

  private elapsed = 0;
  private finished = false;
  private triggered = false;

  constructor(ship: Ship, duration: number, damageMultiplier: number) {
    this.ship = ship;
    this.duration = duration;
    this.damageMultiplier = damageMultiplier;

    this.combatService = BossManager.getInstance().getCombatService();
    this.playerShip = ShipRegistry.getInstance().getPlayerShip();
  }

  public start(): void {
    playSpatialSfx(this.ship, this.playerShip, {
      file: 'assets/sounds/sfx/explosions/explosion_01.wav',
      channel: 'sfx',
      baseVolume: 1.0,
      pitchRange: [0.9, 1.1],
      volumeJitter: 0.15,
      maxSimultaneous: 3,
    });
  }

  public update(dt: number): void {
    this.elapsed += dt;
    if (this.finished) return;

    if (!this.triggered) {
      this.triggered = true;

      const transform = this.ship.getTransform();
      const centerX = transform.position.x;
      const centerY = transform.position.y;

      const step = (Math.PI * 2) / this.numEmitters;

      for (let i = 0; i < this.numEmitters; i++) {
        const angle = i * step;

        const fxX = centerX + Math.cos(angle) * EXPLOSION_OFFSET;
        const fxY = centerY + Math.sin(angle) * EXPLOSION_OFFSET;

        const vx = Math.cos(angle) * this.flameSpeed + transform.velocity.x;
        const vy = Math.sin(angle) * this.flameSpeed + transform.velocity.y;

        emitDefaultFlames(
          fxX,
          fxY,
          this.flameRadius,
          this.flameLifetime,
          true,
          1,
          this.flameColor,
          vx,
          vy
        );
      }

      // Damage check
      const player = this.playerShip;
      if (player) {
        const playerPos = player.getTransform().position;
        const dx = playerPos.x - centerX;
        const dy = playerPos.y - centerY;
        const distSquared = dx * dx + dy * dy;
        const radiusSquared = EXPLOSION_RADIUS * EXPLOSION_RADIUS;

        if (distSquared <= radiusSquared) {
          const damage = EXPLOSION_DAMAGE * this.damageMultiplier;
          // Damage a random block
          this.combatService.applyDamageToRandomBlock(
            player,
            this.ship,
            damage,
            'flameThrower'
          );
          // Add ignite effect
          player.addStatusEffect(
            'ignite',
            6,
            this.ship,
            damage
          );
        }
      }

      createLightFlash(centerX, centerY, 2600, 2.0, 0.7, '#ffae00');
    }

    if (this.elapsed >= this.duration) {
      this.finished = true;
    }
  }

  public isFinished(): boolean {
    return this.finished;
  }

  public cleanup(): void {
    console.log('[RadialExplosion] CLEANUP after', this.elapsed.toFixed(2), 'seconds');
  }
}
