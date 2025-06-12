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
import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { BlockObjectCollisionSystem } from '@/systems/physics/BlockObjectCollisionSystem';
import type { ShipConstructionAnimatorService } from '@/game/ship/systems/ShipConstructionAnimatorService';
import type { IncidentOrchestrator } from '@/systems/incidents/IncidentOrchestrator';

import { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { PopupMessageSystem } from '@/ui/PopupMessageSystem';
import { audioManager } from '@/audio/Audio';
import { ShipFactory } from '@/game/ship/ShipFactory';
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
  private readonly shipFactory: ShipFactory;

  private currentWaveIndex = STARTING_WAVE_INDEX;
  private elapsedTime = 0;
  private timeSinceStart = 0;

  private isRunning = false;
  private isPaused = false;
  private hasSpawnedFirstWave = false;

  private readonly initialDelay = 10;
  private readonly defaultWaveInterval = 120;
  private readonly interWaveDelay = 10;

  private interWaveCountdown = -1;
  private waitingToSpawnNextWave = false;

  private activeWave: ActiveWaveContext | null = null;

  private activeShips: Set<Ship> = new Set();
  private activeControllers: Map<Ship, AIControllerSystem> = new Map();

  private onMissionComplete: (() => void) | null = null;
  private missionCompleteTriggered = false;

  public setMissionCompleteHandler(cb: () => void): void {
    this.onMissionComplete = cb;
  }

  public constructor(
    private readonly waves: WaveDefinition[],
    private readonly shipRegistry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem,
    private readonly playerShip: Ship,
    private readonly projectileSystem: ProjectileSystem,
    private readonly laserSystem: LaserSystem,
    private readonly particleManager: ParticleManager,
    private readonly grid: Grid,
    private readonly combatService: CombatService,
    private readonly explosionSystem: ExplosionSystem,
    private readonly collisionSystem: BlockObjectCollisionSystem,
    private readonly shipConstructionAnimator: ShipConstructionAnimatorService,
    private readonly incidentSystem: IncidentOrchestrator,
    private readonly popupMessageSystem: PopupMessageSystem
  ) {
    this.shipFactory = new ShipFactory(
      this.grid,
      this.shipRegistry,
      this.aiOrchestrator,
      this.playerShip,
      this.particleManager,
      this.projectileSystem,
      this.laserSystem,
      this.combatService,
      this.explosionSystem,
      this.collisionSystem,
      this.shipConstructionAnimator
    );
  }

  public start(): void {
    this.isRunning = true;
    this.timeSinceStart = 0;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public update(dt: number): void {
    if (!this.isRunning || this.isPaused) return;

    // === First wave logic ===
    if (!this.hasSpawnedFirstWave) {
      this.timeSinceStart += dt;
      if (this.timeSinceStart < this.initialDelay) return;

      const wave = this.waves[this.currentWaveIndex];
      this.spawnWave(wave);
      this.currentWaveIndex++;
      this.elapsedTime = 0;
      this.hasSpawnedFirstWave = true;
      return;
    }

    // === Waiting to spawn next wave after boss ===
    if (this.waitingToSpawnNextWave) {
      this.interWaveCountdown -= dt;
      if (this.interWaveCountdown <= 0) {
        this.waitingToSpawnNextWave = false;

        if (this.currentWaveIndex < this.waves.length) {
          const nextWave = this.waves[this.currentWaveIndex];
          this.spawnWave(nextWave);
          this.currentWaveIndex++;
          this.elapsedTime = 0;
        }
      }
      return;
    }

    // === Boss wave in progress, wait ===
    if (this.activeWave?.type === 'boss' && !this.activeWave.isComplete) return;

    // === Check for mission completion FIRST ===
    if (this.shouldCompleteMission()) {
      if (!this.missionCompleteTriggered) {
        this.missionCompleteTriggered = true;
        console.log('Mission completed!');
        this.onMissionComplete?.();
        this.onMissionComplete = null;
      }
      return;
    }

    // === Proceed with normal wave logic ===
    this.elapsedTime += dt;
    if (this.currentWaveIndex < this.waves.length) {
      const nextWave = this.waves[this.currentWaveIndex];
      const interval = nextWave.waveDurationSeconds ?? this.defaultWaveInterval;
      if (this.elapsedTime >= interval) {
        this.spawnWave(nextWave);
        this.currentWaveIndex++;
        this.elapsedTime = 0;
      }
    }
  }

  public shouldCompleteMission(): boolean {
    // Mission is complete when:
    // 1. All waves have been spawned
    // 2. No enemies remain alive
    // 3. Not waiting to spawn another wave
    const allWavesSpawned = this.currentWaveIndex >= this.waves.length;
    const noRemainingEnemies = this.activeShips.size === 0;
    const notWaitingForNextWave = !this.waitingToSpawnNextWave;

    return allWavesSpawned && noRemainingEnemies && notWaitingForNextWave;
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

    if (this.activeWave) {
      this.incidentSystem.clear(this.activeWave.id);
    }
  }

  private async spawnWave(wave: WaveDefinition): Promise<void> {
    console.log(`Spawning wave ${wave.id} (type: ${wave.type})`);
    
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
        const posX = wave.type === 'boss'
          ? (Math.random() - 0.5) * 200
          : Math.random() * WORLD_WIDTH - WORLD_WIDTH / 2;

        const posY = wave.type === 'boss'
          ? (Math.random() - 0.5) * 200
          : Math.random() * WORLD_HEIGHT - WORLD_HEIGHT / 2;

        const { ship, controller } = await this.shipFactory.createShip(
          entry.shipId,
          posX,
          posY,
          entry.hunter ?? false,
          entry.behaviorProfile,
          entry.affixes ?? {}
        );

        this.applyModifiers(ship, wave.mods);

        this.activeShips.add(ship);
        this.activeControllers.set(ship, controller);

        spawnedShips.push(ship);
      }
    }

    // Spawn events after all ships are spawned
    for (const incident of wave.incidents ?? []) {
      const roll = Math.random();
      if (roll <= incident.spawnChance) {
        console.log(
          `[WaveSpawner] Triggering incident '${incident.script}' (wave ${wave.id})`
        );
        this.incidentSystem.trigger(incident.script, incident.options ?? {}, wave.id);
      }
    }

    if (wave.type === 'boss') {
      audioManager.playMusic(wave.music ?? { file: 'assets/sounds/music/track_03_boss.mp3' });
      this.popupMessageSystem.displayMessage('⚠ DANGER ⚠', {
        color: '#ff5555',
        duration: 4,
        glow: true,
        font: '28px monospace',
      });
      if (wave.lightingSettings?.clearColor) {
        const lightingOrchestrator = LightingOrchestrator.getInstance();
        lightingOrchestrator.setClearColor(...wave.lightingSettings.clearColor);
      }
      this.monitorBossWaveCompletion(spawnedShips);
    } else {
      this.popupMessageSystem.displayMessage('Wave ' + wave.id, {
        color: '#00ff00',
        duration: 3,
        glow: true,
        font: '28px monospace',
      });
    }
  }

  public skipToNextWave(): void {
    if (this.currentWaveIndex >= this.waves.length) return;

    // this.clearCurrentWave();

    // Mark the skipped wave as completed
    if (this.activeWave) {
      this.activeWave.isComplete = true;
    }

    // If we're at the last wave, don't try to spawn another
    if (this.currentWaveIndex >= this.waves.length) return;

    const wave = this.waves[this.currentWaveIndex];

    // Schedule inter-wave delay if the previous wave was a boss
    if (this.activeWave?.type === 'boss') {
      this.waitingToSpawnNextWave = true;
      this.interWaveCountdown = this.interWaveDelay;
      this.activeWave = null; // Effectively skip it
      return; // Let update() handle spawning on next tick
    }

    // For regular waves, spawn immediately
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
      ship.onDestroyedCallback(() => {
        if (!remaining.has(ship)) return;
        remaining.delete(ship);

        if (remaining.size === 0 && this.activeWave?.type === 'boss') {
          this.activeWave.isComplete = true;
          console.log(`Boss wave ${this.activeWave.id} defeated.`);

          // Check if this is the final wave
          const isFinalWave = this.currentWaveIndex >= this.waves.length;
          
          if (isFinalWave) {
            // Don't start inter-wave countdown for the final wave
            console.log('Final boss defeated - mission should complete');
          } else {
            // Start inter-wave delay for non-final boss waves
            this.waitingToSpawnNextWave = true;
            this.interWaveCountdown = this.interWaveDelay;
          }
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

    // If mission is complete, don't show countdown
    if (this.shouldCompleteMission()) return -1;

    const nextWave = this.waves[this.currentWaveIndex];
    const interval = nextWave?.waveDurationSeconds ?? this.defaultWaveInterval;
    return Math.max(0, interval - this.elapsedTime);
  }

  public isBossWaveActive(): boolean {
    return this.activeWave?.type === 'boss' && !this.activeWave.isComplete;
  }

  public isBossWaveComplete(): boolean {
    return this.activeWave?.type === 'boss' && this.activeWave.isComplete;
  }

  public notifyShipDestruction(ship: Ship): void {
    // Remove from active tracking immediately
    const wasTracked = this.activeShips.has(ship);
    if (wasTracked) {
      missionResultStore.incrementKillCount();
    }
    this.activeShips.delete(ship);
    
    const controller = this.activeControllers.get(ship);
    if (controller) {
      // Note: AI controller should already be removed by AIOrchestratorSystem
      // but we clean up our local reference
      this.activeControllers.delete(ship);
    }
  }

  public reset(): void {
    this.clearCurrentWave();
    this.currentWaveIndex = STARTING_WAVE_INDEX;
    this.isRunning = false;
    this.hasSpawnedFirstWave = false;
    this.elapsedTime = 0;
    this.timeSinceStart = 0;
    this.interWaveCountdown = -1;
    this.waitingToSpawnNextWave = false;
    this.activeWave = null;
    this.activeShips.clear();
    this.activeControllers.clear();
    this.onMissionComplete = null;
    this.missionCompleteTriggered = false;
  }
}