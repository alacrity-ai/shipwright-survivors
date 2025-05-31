// src/systems/wavespawner/WaveSpawner.ts

import { WORLD_WIDTH, WORLD_HEIGHT } from '@/config/world';
import type { IUpdatable } from '@/core/interfaces/types';
import type { Grid } from '@/systems/physics/Grid';
import type { Ship } from '@/game/ship/Ship';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import type { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import type { LaserSystem } from '@/systems/physics/LaserSystem';
import type { ParticleManager } from '@/systems/fx/ParticleManager';
import { loadShipFromJson } from '@/systems/serialization/ShipSerializer';
import { waveDefinitions, type WaveDefinition } from '@/game/waves/WaveDefinitions';
import { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';
import { MovementSystem } from '@/systems/physics/MovementSystem';
import { WeaponSystem } from '@/systems/combat/WeaponSystem';
import { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import { ShieldToggleBackend } from '@/systems/combat/backends/ShieldToggleBackend';
import { ExplosiveLanceBackend } from '@/systems/combat/backends/ExplosiveLanceBackend';
import { UtilitySystem } from '@/systems/combat/UtilitySystem';
import { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import { SeekTargetState } from '@/systems/ai/fsm/SeekTargetState';

import { TurretBackend } from '@/systems/combat/backends/TurretBackend';
import { LaserBackend } from '@/systems/combat/backends/LaserBackend';
import { CombatService } from '@/systems/combat/CombatService';

type WaveType = 'wave' | 'boss' | string;
type WaveMod = 'shielded' | 'extra-aggressive' | string;

interface ActiveWaveContext {
  id: number;
  type: WaveType;
  mods: WaveMod[];
  isComplete: boolean;
}

const STARTING_WAVE_INDEX = 0;

export class WaveSpawner implements IUpdatable {
  private static instance: WaveSpawner;

  private currentWaveIndex = STARTING_WAVE_INDEX;
  private hasStarted = false;
  private elapsedTime = 0;
  private timeSinceStart = 0;

  private readonly initialDelay = 10;
  private readonly waveInterval = 120;
  private readonly interWaveDelay = 10;

  private interWaveCountdown = -1;
  private waitingToSpawnNextWave = false;

  private activeWave: ActiveWaveContext | null = null;

  private activeShips: Set<Ship> = new Set();
  private activeControllers: Map<Ship, AIControllerSystem> = new Map();

  private constructor(
    private readonly shipRegistry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem,
    private readonly playerShip: Ship,
    private readonly projectileSystem: ProjectileSystem,
    private readonly laserSystem: LaserSystem,
    private readonly particleManager: ParticleManager,
    private readonly grid: Grid,
    private readonly combatService: CombatService,
    private readonly explosionSystem: ExplosionSystem
  ) {}

  public static getInstance(
    shipRegistry: ShipRegistry,
    aiOrchestrator: AIOrchestratorSystem,
    playerShip: Ship,
    projectileSystem: ProjectileSystem,
    laserSystem: LaserSystem,
    particleManager: ParticleManager,
    grid: Grid,
    combatService: CombatService,
    explosionSystem: ExplosionSystem
  ): WaveSpawner {
    if (!WaveSpawner.instance) {
      WaveSpawner.instance = new WaveSpawner(
        shipRegistry,
        aiOrchestrator,
        playerShip,
        projectileSystem,
        laserSystem,
        particleManager,
        grid,
        combatService,
        explosionSystem
      );
    }
    return WaveSpawner.instance;
  }

  public update(dt: number): void {
    // === Initial wave logic ===
    if (!this.hasStarted) {
      this.timeSinceStart += dt;
      if (this.timeSinceStart < this.initialDelay) return;

      const wave = waveDefinitions[this.currentWaveIndex];
      this.spawnWave(wave);
      this.currentWaveIndex++;
      this.elapsedTime = 0;
      this.hasStarted = true;
      return;
    }

    // === Waiting to spawn next wave after boss ===
    if (this.waitingToSpawnNextWave) {
      this.interWaveCountdown -= dt;
      if (this.interWaveCountdown <= 0) {
        this.waitingToSpawnNextWave = false;

        if (this.currentWaveIndex < waveDefinitions.length) {
          const nextWave = waveDefinitions[this.currentWaveIndex];
          this.spawnWave(nextWave);
          this.currentWaveIndex++;
          this.elapsedTime = 0;
        }
        return;
      } else {
        return;
      }
    }

    // === Boss wave in progress, wait ===
    if (this.activeWave?.type === 'boss' && !this.activeWave.isComplete) return;

    // === Proceed with normal wave logic ===
    this.elapsedTime += dt;

    if (this.currentWaveIndex < waveDefinitions.length && this.elapsedTime >= this.waveInterval) {
      const wave = waveDefinitions[this.currentWaveIndex];
      this.spawnWave(wave);
      this.currentWaveIndex++;
      this.elapsedTime = 0;
    }
  }

  private clearCurrentWave(): void {
    for (const ship of this.activeShips) {
      this.shipRegistry.remove(ship);
      const controller = this.activeControllers.get(ship);
      if (controller) {
        this.aiOrchestrator.removeController(controller);
        this.activeControllers.delete(ship);
      }
      ship.destroy();
    }
    this.activeShips.clear();
  }

  private async spawnWave(wave: WaveDefinition): Promise<void> {
    this.activeWave = {
      id: wave.id,
      type: wave.type,
      mods: wave.mods,
      isComplete: false,
    };

    // === Clean up previous wave if this is a boss ===
    if (wave.type === 'boss') {
      this.clearCurrentWave();
    }

    const spawnedShips: Ship[] = [];

    for (const entry of wave.ships) {
      for (let i = 0; i < entry.count; i++) {
        const ship = await loadShipFromJson(`${entry.shipId}.json`, this.grid);

        const transform = ship.getTransform();
        if (wave.type === 'boss') {
          // Spawn bosses near origin for high drama
          transform.position.x = (Math.random() - 0.5) * 200;
          transform.position.y = (Math.random() - 0.5) * 200;
        } else {
          // Normal enemy spawn spread across full world
          transform.position.x = Math.random() * WORLD_WIDTH - WORLD_WIDTH / 2;
          transform.position.y = Math.random() * WORLD_HEIGHT - WORLD_HEIGHT / 2;
        }

        this.shipRegistry.add(ship);

        const emitter = new ThrusterEmitter(this.particleManager);
        const movement = new MovementSystem(ship, emitter);
        const weapons = new WeaponSystem(
          new TurretBackend(this.projectileSystem), 
          new LaserBackend(this.laserSystem),
          new ExplosiveLanceBackend(this.combatService, this.particleManager, this.grid, this.explosionSystem)
        );
        const utility = new UtilitySystem(new ShieldToggleBackend());
        const controller = new AIControllerSystem(ship, movement, weapons, utility);
        controller['currentState'] = new SeekTargetState(controller, ship, this.playerShip);

        this.aiOrchestrator.addController(controller);
        this.applyModifiers(ship, wave.mods);

        this.activeShips.add(ship);
        this.activeControllers.set(ship, controller);

        spawnedShips.push(ship);
      }
    }

    if (wave.type === 'boss') {
      this.monitorBossWaveCompletion(spawnedShips);
    }
  }

  public skipToNextWave(): void {
    if (this.currentWaveIndex >= waveDefinitions.length) return;

    this.clearCurrentWave();

    const wave = waveDefinitions[this.currentWaveIndex];
    this.spawnWave(wave);
    this.currentWaveIndex++;
    this.elapsedTime = 0;
    this.waitingToSpawnNextWave = false;
  }

  private applyModifiers(ship: Ship, mods: WaveMod[]): void {
    for (const mod of mods) {
      switch (mod) {
        case 'shielded':
          // ship.setShielded?.(true);
          break;
        case 'extra-aggressive':
          // ship.setAIMode?.('berserk');
          break;
        default:
          console.warn(`Unknown wave modifier: ${mod}`);
      }
    }
  }

  private monitorBossWaveCompletion(ships: Ship[]): void {
    const remaining = new Set<Ship>(ships);
    for (const ship of ships) {
      ship.onDestroyed(() => {
        if (!remaining.has(ship)) return; // Already cleaned up
        remaining.delete(ship);

        if (remaining.size === 0 && this.activeWave?.type === 'boss') {
          this.activeWave.isComplete = true;
          console.log(`Boss wave ${this.activeWave.id} defeated.`);
          this.waitingToSpawnNextWave = true;
          this.interWaveCountdown = this.interWaveDelay;
        }
      });
    }
  }

  public getCurrentWaveNumber(): number {
    return this.currentWaveIndex;
  }

  public getTimeUntilNextWave(): number {
    if (this.waitingToSpawnNextWave) {
      return Math.ceil(this.interWaveCountdown);
    }

    if (this.currentWaveIndex === 0 && this.timeSinceStart < this.initialDelay) {
      return Math.ceil(this.initialDelay - this.timeSinceStart);
    }

    if (this.activeWave?.type === 'boss' && !this.activeWave.isComplete) return -1;

    return Math.max(0, this.waveInterval - this.elapsedTime);
  }

  public isBossWaveActive(): boolean {
    return this.activeWave?.type === 'boss' && !this.activeWave.isComplete;
  }

  public notifyShipDestruction(ship: Ship): void {
    // Remove from active tracking immediately
    const wasTracked = this.activeShips.has(ship);
    this.activeShips.delete(ship);
    
    const controller = this.activeControllers.get(ship);
    if (controller) {
      // Note: AI controller should already be removed by AIOrchestratorSystem
      // but we clean up our local reference
      this.activeControllers.delete(ship);
    }
  }
}
