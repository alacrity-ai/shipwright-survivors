// src/core/EngineRuntime.ts
import { Camera } from './Camera';
import { CanvasManager } from './CanvasManager';
import { InputManager } from './InputManager';
import { GameLoop } from './GameLoop';
import type { IUpdatable, IRenderable } from '@/core/interfaces/types';

import { missionLoader } from '@/game/missions/MissionLoader';
import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { sceneManager } from './SceneManager';
import { ShipBuilderMenu } from '@/ui/menus/ShipBuilderMenu';
import { PauseMenu } from '@/ui/menus/PauseMenu';
import { HudOverlay } from '@/ui/overlays/HudOverlay';
import { WavesOverlay } from '@/ui/overlays/WavesOverlay';
import { DebugOverlay } from '@/ui/overlays/DebugOverlay';
import { MiniMap } from '@/ui/overlays/MiniMap';

import { BackgroundRenderer } from '@/rendering/BackgroundRenderer';
import { MultiShipRenderer } from '@/rendering/MultiShipRenderer';
import { CursorRenderer } from '@/rendering/CursorRenderer';

import { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import { LaserSystem } from '@/systems/physics/LaserSystem';
import { PickupSystem } from '@/systems/pickups/PickupSystem';
import { ParticleManager } from '@/systems/fx/ParticleManager';
import { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';

import { PlayerControllerSystem } from '@/systems/controls/PlayerControllerSystem';
import { MissionDialogueManager } from '@/systems/dialogue/MissionDialogueManager';
import { MovementSystem } from '@/systems/physics/MovementSystem';
import { WeaponSystem } from '@/systems/combat/WeaponSystem';
import { UtilitySystem } from '@/systems/combat/UtilitySystem';
import { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import { ShipBuilderController } from '@/systems/subsystems/ShipBuilderController';
import { ShipDestructionService } from '@/game/ship/ShipDestructionService';
import { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import { WaveSpawner } from '@/systems/wavespawner/WaveSpawner';
import { TurretBackend } from '@/systems/combat/backends/TurretBackend';
import { LaserBackend } from '@/systems/combat/backends/LaserBackend';
import { ExplosiveLanceBackend } from '@/systems/combat/backends/ExplosiveLanceBackend';
import { ShieldToggleBackend } from '@/systems/combat/backends/ShieldToggleBackend';
import { CombatService } from '@/systems/combat/CombatService';
import { EnergyRechargeSystem } from '@/game/ship/systems/EnergyRechargeSystem';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { ShipCullingSystem } from '@/game/ship/systems/ShipCullingSystem';
import { getStarterShip } from '@/game/ship/utils/PrefabHelpers';
import { Grid } from '@/systems/physics/Grid';

import type { Ship } from '@/game/ship/Ship';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import { ShieldEffectsSystem } from '@/systems/fx/ShieldEffectsSystem';
import { RepairEffectSystem } from '@/systems/fx/RepairEffectSystem';
import { ScreenEffectsSystem } from '@/systems/fx/ScreenEffectsSystem';

import { PlayerResources } from '@/game/player/PlayerResources';
import { PlayerStats } from '@/game/player/PlayerStats';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';

export class EngineRuntime {
  private gameLoop: GameLoop;
  private readonly boundUpdate = (dt: number) => this.update(dt);
  private readonly boundRender = (dt: number) => this.render(dt);

  private inputManager: InputManager;
  private missionDialogueManager: MissionDialogueManager;
  private shipBuilderMenu: ShipBuilderMenu
  private pauseMenu: PauseMenu;
  private hud: HudOverlay;
  private miniMap: MiniMap;

  private canvasManager: CanvasManager;
  private camera: Camera | null = null;

  private mission: MissionDefinition
  private shipRegistry = ShipRegistry.getInstance();
  private shipCulling: ShipCullingSystem;
  private aiOrchestrator: AIOrchestratorSystem;

  private grid: Grid | null = null;
  private ship: Ship | null = null;

  private projectileSystem: ProjectileSystem;
  private laserSystem: LaserSystem;
  private pickupSystem: PickupSystem;
  private particleManager: ParticleManager;
  private background: BackgroundRenderer;
  private multiShipRenderer: MultiShipRenderer;
  private cursorRenderer: CursorRenderer;
  private waveSpawner: WaveSpawner;
  private wavesOverlay: WavesOverlay;
  private debugOverlay: DebugOverlay;

  private movement: MovementSystem;
  private weaponSystem: WeaponSystem;
  private utilitySystem: UtilitySystem;
  private energyRechargeSystem: EnergyRechargeSystem;
  private playerController: PlayerControllerSystem;
  private shipBuilderController: ShipBuilderController;
  private explosionSystem: ExplosionSystem;
  private repairEffectSystem: RepairEffectSystem;
  private screenEffects: ScreenEffectsSystem;

  private updatables: IUpdatable[] = [];
  private renderables: IRenderable[] = [];

  private isDestroyed = false;

  constructor() {
    this.canvasManager = new CanvasManager();
    this.inputManager = new InputManager(this.canvasManager.getCanvas('ui'));
    this.missionDialogueManager = new MissionDialogueManager(this.inputManager, this.canvasManager);
    
    this.gameLoop = new GameLoop();
    this.cursorRenderer = new CursorRenderer(this.canvasManager, this.inputManager);
    this.shipBuilderMenu = new ShipBuilderMenu(this.inputManager, this.cursorRenderer);
    this.pauseMenu = new PauseMenu(this.inputManager, this.handlePlayerFailure.bind(this));
    this.camera = new Camera(1280, 720);
    this.particleManager = new ParticleManager(this.canvasManager.getContext('particles'), this.camera);
    ShieldEffectsSystem.initialize(this.canvasManager, this.camera);

    this.mission = missionLoader.getMission();
    missionResultStore.initialize();

    // Initialize player resources with starting currency
    const playerResources = PlayerResources.getInstance();
    playerResources.initialize(0); // Start with 0 currency
    const playerStats = PlayerStats.getInstance();
    playerStats.initialize(100); // Start with 100 energy
    const playerTechManager = PlayerTechnologyManager.getInstance();
    playerTechManager.unlockMany(['hull1', 'engine1', 'turret1', 'fin1', 'facetplate1']);

    this.grid = new Grid();  // Initialize global grid
    this.ship = getStarterShip(this.grid);  // Now the grid is initialized before passing to getStarterShip

    // Register player ship using the Singleton ShipRegistry
    this.shipRegistry.add(this.ship);
    this.shipCulling = new ShipCullingSystem(this.shipRegistry, this.camera);

    // Initialize ExplosionSystem and ScreenEffectsSystem
    this.explosionSystem = new ExplosionSystem(this.canvasManager, this.camera, this.particleManager);
    this.screenEffects = new ScreenEffectsSystem(this.canvasManager);
    
    // === Step 1: Initialize orchestrator first ===
    this.aiOrchestrator = new AIOrchestratorSystem();

    // === Step 2: Construct PickupSystem and PickupSpawner (unchanged) ===
    this.pickupSystem = new PickupSystem(this.canvasManager, this.camera, this.ship, this.particleManager);
    const pickupSpawner = new PickupSpawner(this.pickupSystem);

    const destructionService = new ShipDestructionService(
      this.explosionSystem,
      pickupSpawner,
      this.shipRegistry,
      this.aiOrchestrator,
    );

    const combatService = new CombatService(
      this.explosionSystem,
      pickupSpawner,
      destructionService
    );

    // === Step 4: Instantiate ProjectileSystem with CombatService ===
    // Deprecate this awful class and put it into the turret backend 
    this.projectileSystem = new ProjectileSystem(
      this.canvasManager,
      this.grid,
      combatService,
      this.particleManager,
    );

    this.laserSystem = new LaserSystem(
      this.canvasManager,
      this.camera,
      this.grid,
      combatService,
      this.particleManager
    );

    // this.thrusterFx = new ThrusterParticleSystem(this.canvasManager, this.camera);
    this.background = new BackgroundRenderer(this.canvasManager, this.camera, this.mission.environmentSettings?.backgroundId);
    this.multiShipRenderer = new MultiShipRenderer(this.canvasManager, this.camera, this.shipCulling, this.inputManager);

    // Add components to player ship (Should all be abstracted into one factory)
    const emitter = new ThrusterEmitter(this.particleManager);
    this.movement = new MovementSystem(this.ship, emitter);
    this.weaponSystem = new WeaponSystem(
      new TurretBackend(this.projectileSystem),
      new LaserBackend(this.laserSystem),
      new ExplosiveLanceBackend(combatService, this.particleManager, this.grid, this.explosionSystem)
    );
    this.utilitySystem = new UtilitySystem(
      new ShieldToggleBackend()
    );

    this.energyRechargeSystem = new EnergyRechargeSystem(this.shipRegistry);
    this.playerController = new PlayerControllerSystem(this.camera, this.inputManager, this.cursorRenderer);
    this.repairEffectSystem = new RepairEffectSystem(this.canvasManager, this.camera);
    this.shipBuilderController = new ShipBuilderController(
      this.ship, 
      this.shipBuilderMenu, 
      this.camera, 
      this.repairEffectSystem,
      this.inputManager
    );
    this.shipBuilderMenu.setRepairAllHandler(() => {
      this.shipBuilderController.repairAllBlocks();
    });

    this.hud = new HudOverlay(this.canvasManager, this.ship);
    this.miniMap = new MiniMap(this.canvasManager, this.ship, this.shipRegistry);

    // Create the enemy wave spawner
    this.waveSpawner = new WaveSpawner(
      this.mission.waves,
      this.shipRegistry,
      this.aiOrchestrator,
      this.ship,
      this.projectileSystem,
      this.laserSystem,
      this.particleManager,
      this.grid,
      combatService,
      this.explosionSystem
    );
    this.waveSpawner.setMissionCompleteHandler(() => this.handlePlayerVictory());
    destructionService.onShipDestroyed((ship, _cause) => {
      this.waveSpawner.notifyShipDestruction(ship);
    });
    this.wavesOverlay = new WavesOverlay(this.canvasManager, this.waveSpawner);

    // Debug overlay
    this.debugOverlay = new DebugOverlay(this.canvasManager, this.shipRegistry, this.aiOrchestrator);

    this.updatables = [
      this.movement,
      this.projectileSystem,
      this.laserSystem,
      this.particleManager,
      this.aiOrchestrator,
      this.explosionSystem,
      ShieldEffectsSystem.getInstance(),
      this.screenEffects,
      this.pickupSystem,
      this.waveSpawner,
      this.energyRechargeSystem,
      {
        update: (dt: number) => {
          if (!this.ship) {
            return;
          }

          const intent: ShipIntent = this.playerController.getIntent();
          this.movement.setIntent(intent.movement);
          this.weaponSystem.setIntent(intent.weapons);
          this.utilitySystem.setIntent(intent.utility);

          try {
            this.weaponSystem.update(dt, this.ship, this.ship.getTransform());
            this.utilitySystem.update(dt, this.ship, this.ship.getTransform());
          } catch (error) {
            console.error("Error updating system:", error);
          }
        }
      },
      this.background,
      this.missionDialogueManager
    ];

    this.renderables = [
      this.background,
      this.laserSystem,
      this.pickupSystem,
      this.particleManager,
      this.multiShipRenderer,
      this.hud,
      this.miniMap,
      this.explosionSystem,
      ShieldEffectsSystem.getInstance(),
      this.screenEffects,
      this.wavesOverlay,
      this.debugOverlay,
      this.missionDialogueManager
    ];

    this.registerLoopHandlers();
  }

  private registerLoopHandlers() {
    this.gameLoop.onUpdate(this.boundUpdate);
    this.gameLoop.onRender(this.boundRender);
  }

  private update = (dt: number) => {
    if (this.isDestroyed) return;

    // Toggle the ship builder menu with Tab
    if (this.inputManager.wasKeyJustPressed('Tab') && !this.pauseMenu.isOpen()) {
      if (!this.shipBuilderMenu.isOpen()) {
        this.shipBuilderMenu.openMenu();
      } else {
        this.shipBuilderMenu.closeMenu();
      }
    }

    if (this.inputManager.wasKeyJustPressed('Escape')) {
      if (this.shipBuilderMenu.isOpen()) {
        this.shipBuilderMenu.closeMenu();
      } else {
        if (!this.pauseMenu.isOpen()) {
          this.pauseMenu.openMenu();
        } else {
          this.pauseMenu.closeMenu();
        }
      }
    }

    if (this.pauseMenu.isOpen()) {
      this.pauseMenu.update();
    }

    if (this.shipBuilderMenu.isOpen()) {
      this.shipBuilderMenu.update();
    }

    // Debug keys 

    if (this.inputManager.wasKeyJustPressed('Digit0')) {
      PlayerResources.getInstance().addCurrency(1000);
    }

    if (this.inputManager.wasKeyJustPressed('KeyU')) {
      PlayerTechnologyManager.getInstance().unlockAll();
    }

    if (this.inputManager.wasRightBracketPressed()) {
      this.waveSpawner.skipToNextWave();
    }

    if (this.inputManager.wasKeyJustPressed('KeyM')) {
      console.log("Skipping to victory screen...");
      this.handlePlayerVictory();
    }

    try {
      if (
        !this.ship ||
        typeof this.ship.getTransform !== 'function' ||
        !this.camera
      ) {
        return;
      }
      const transform = this.ship.getTransform();
      this.camera.adjustZoom(this.inputManager.consumeZoomDelta());
      this.camera.follow(transform.position);
      if (this.shipBuilderMenu.isOpen()) {
          this.shipBuilderController.update(transform);
      }
    } catch (error) {
      console.error("Error getting ship transform:", error);
    }

    // Always update the RepairEffectSystem
    this.repairEffectSystem.update(dt);

    if (!this.shipBuilderMenu.isOpen() && !this.pauseMenu.isOpen()) {
      this.updatables.forEach(system => system.update(dt));
    }

    this.inputManager.updateFrame();
  };

  private render = (dt: number) => {
    if (!this.ship || this.isDestroyed) return;
    const transform = this.ship.getTransform();

    this.canvasManager.clearLayer('entities');
    this.canvasManager.clearLayer('fx');
    this.canvasManager.clearLayer('particles');
    this.canvasManager.clearLayer('ui');
    this.canvasManager.clearLayer('overlay');
    this.canvasManager.clearLayer('dialogue');

    this.renderables.forEach(system => system.render(dt));

    // Always render the repair effect system
    this.repairEffectSystem.render();

    if (this.shipBuilderMenu.isOpen()) {
      this.shipBuilderController.render(this.canvasManager.getContext('entities'), transform);
      this.shipBuilderMenu.render(this.canvasManager.getContext('ui'));
    }

    if (this.pauseMenu.isOpen()) {
      this.pauseMenu.render(this.canvasManager.getContext('ui'));
    }

    // this.dialogueQueueManager.render(this.canvasManager.getContext('dialogue'));
    this.cursorRenderer.render();
  };

  public start() {
    this.gameLoop.start();
    this.missionDialogueManager.initialize();
  }

  public handlePlayerVictory(timeoutMs: number = 10_000): void {
    console.log("Player victorious — debriefing will begin in 10 seconds...");

    // Optional: trigger victory effects here (e.g. music, overlay)
    // victoryEffectManager.play(); // hypothetical example

    setTimeout(() => {
      missionResultStore.finalize('victory', this.gameLoop.getElapsedSeconds());
      this.destroy();
      sceneManager.setScene('debriefing');
    }, timeoutMs);
  }

  public handlePlayerFailure(): void {
    console.log("Player defeated — transitioning to debriefing screen.");
    missionResultStore.finalize('defeat', this.gameLoop.getElapsedSeconds());
    this.destroy();
    sceneManager.setScene('debriefing');
  }

  public destroy(): void {
    console.log("EngineRuntime: Performing cleanup before scene transition.");

    this.isDestroyed = true;
    this.gameLoop.offUpdate(this.boundUpdate);
    this.gameLoop.offRender(this.boundRender);
    this.gameLoop.stop();

    // === Clean up singleton state ===
    this.waveSpawner.reset();
    this.shipRegistry.clear();
    this.aiOrchestrator.clear();
    ShieldEffectsSystem.getInstance().clear();
    PlayerResources.getInstance().destroy();
    PlayerStats.getInstance().destroy();
    PlayerTechnologyManager.getInstance().destroy();

    // Optional: clear UI menus, overlays
    this.hud.destroy();

    // // Clear rendering and update lists
    this.updatables.length = 0;
    this.renderables.length = 0;

    // Optional: Clear event listeners from global input systems
    this.inputManager.destroy(); // or similar method

    // Null references (defensive)
    this.ship = null;
    this.camera = null;
    this.grid = null;

    console.log("EngineRuntime: Cleanup complete.");
  }
}
