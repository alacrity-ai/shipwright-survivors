// src/game/boss/ai/mechanics/mechs/MinefieldMechanic.ts

import type { BaseBossMechanic } from '../BaseBossMechanic';
import type { Ship } from '@/game/ship/Ship';
import type { CombatService } from '@/systems/combat/CombatService';

import { shakeCamera } from '@/core/interfaces/events/CameraReporter';

import { ArenaManager } from '@/game/arena/ArenaManager';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { BossManager } from '@/game/boss/BossManager';

import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { spawnMineWave, clearMineWave } from '@/game/boss/ai/mechanics/helpers/spawnMineHelper';
import { audioManager } from '@/audio/Audio';

const MINE_EXPLOSION_DAMAGE = 100;
const MINE_EXPLOSION_WORLD_RADIUS = 328;
const BIG_MINE_EXPLOSION_WORLD_RADIUS = 1200;

const MINE_RING_FRACTIONS = [0.3, 0.6, 0.9];
const MINES_PER_RING = [6, 10, 14];

const MINE_SHIP_ID = 'mines/mine_00';
const BIG_MINE_SHIP_ID = 'mines/mine_01';

export class MinefieldMechanic implements BaseBossMechanic {
  public name = 'Minefield';

  private elapsed = 0;
  private readonly duration: number;
  private finished = false;

  private readonly combatService: CombatService;
  private readonly playerShip: Ship | null;
  private readonly damageMultiplier: number;
  private readonly bigMineCount: number;

  private mineTags: string[] = [];
  private bigMineIndices: Set<number> = new Set();

  constructor(
    private readonly ship: Ship,
    duration: number,
    damageMultiplier: number,
    bigMineCount: number = 0
  ) {
    this.duration = duration;
    this.damageMultiplier = damageMultiplier;
    this.bigMineCount = bigMineCount;
    this.combatService = BossManager.getInstance().getCombatService();
    this.playerShip = ShipRegistry.getInstance().getPlayerShip();
  }

  public start(): void {
    const arenaManager = ArenaManager.getInstance();
    const [centerX, centerY] = arenaManager.getArenaCenter();
    const arenaRadius = arenaManager.getArenaRadius();

    let tagIndex = 0;
    const totalMines = MINES_PER_RING.reduce((sum, n) => sum + n, 0);

    // Compute evenly spaced indices for big mines
    if (this.bigMineCount > 0) {
      const spacing = totalMines / this.bigMineCount;
      for (let i = 0; i < this.bigMineCount; i++) {
        const idx = Math.floor(i * spacing + spacing / 2);
        this.bigMineIndices.add(idx);
      }
    }

    for (let r = 0; r < MINE_RING_FRACTIONS.length; r++) {
      const radius = MINE_RING_FRACTIONS[r] * arenaRadius;
      const count = MINES_PER_RING[r];
      const angleStep = (Math.PI * 2) / count;

      for (let i = 0; i < count; i++) {
        const angle = angleStep * i;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        const shipId = this.bigMineIndices.has(tagIndex) ? BIG_MINE_SHIP_ID : MINE_SHIP_ID;
        const tag = spawnMineWave(tagIndex++, { x, y }, shipId);
        this.mineTags.push(tag);
      }
    }
  }

  public update(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.finished = true;

      const player = this.playerShip;
      if (!player) return;

      const playerPos = player.getTransform().position;
      const damage = MINE_EXPLOSION_DAMAGE * this.damageMultiplier;

      const arenaManager = ArenaManager.getInstance();
      const [centerX, centerY] = arenaManager.getArenaCenter();
      const arenaRadius = arenaManager.getArenaRadius();

      let tagIndex = 0;

      for (let r = 0; r < MINE_RING_FRACTIONS.length; r++) {
        const radius = MINE_RING_FRACTIONS[r] * arenaRadius;
        const count = MINES_PER_RING[r];
        const angleStep = (Math.PI * 2) / count;

        for (let i = 0; i < count; i++) {
          const angle = angleStep * i;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          const isBig = this.bigMineIndices.has(tagIndex);
          const explosionRadius = isBig ? BIG_MINE_EXPLOSION_WORLD_RADIUS : MINE_EXPLOSION_WORLD_RADIUS;

          const dx = x - playerPos.x;
          const dy = y - playerPos.y;
          const distSq = dx * dx + dy * dy;

          if (distSq <= explosionRadius * explosionRadius) {
            for (let j = 0; j < 8; j++) {
              this.combatService.applyDamageToRandomBlock(player, this.ship, damage, 'projectile');
            }
          }

          createLightFlash(x, y, explosionRadius, 2.0, 1.4, '#ffffff');

          const tag = this.mineTags[tagIndex++];
          clearMineWave(tag);
        }
      }

      shakeCamera(12, 1.4, 12);
      createLightFlash(centerX, centerY, 2600, 2.0, 0.5, '#ff3211');
      audioManager.play('assets/sounds/sfx/explosions/explosion_01.wav', 'sfx');
      this.mineTags.length = 0;
      this.bigMineIndices.clear();
    }
  }

  public isFinished(): boolean {
    return this.finished;
  }

  public cleanup(): void {
    for (const tag of this.mineTags) {
      clearMineWave(tag);
    }
    this.mineTags.length = 0;
    this.bigMineIndices.clear();
    console.log('[Minefield] CLEANUP after', this.elapsed.toFixed(2), 'seconds');
  }
}
