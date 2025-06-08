// src/core/EngineRuntime.ts
import { Camera } from './Camera';
import { getViewportWidth, getViewportHeight, getUniformScaleFactor } from '@/config/view';
import { CanvasManager } from './CanvasManager';
import { InputManager } from './InputManager';
import { GameLoop } from './GameLoop';

import type { IUpdatable, IRenderable } from '@/core/interfaces/types';

import { missionLoader } from '@/game/missions/MissionLoader';
import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { sceneManager } from './SceneManager';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

import { MenuManager } from '@/ui/MenuManager';
import { ShipBuilderMenu } from '@/ui/menus/ShipBuilderMenu';
import { SpaceStationBuilderMenu } from '@/ui/menus/dev/SpaceStationBuilderMenu';
import { SpaceStationBuilderController } from '@/ui/menus/dev/SpaceStationBuilderController';
import { SettingsMenu } from '@/ui/menus/SettingsMenu';
import { PauseMenu } from '@/ui/menus/PauseMenu';
import { HudOverlay } from '@/ui/overlays/HudOverlay';
import { WavesOverlay } from '@/ui/overlays/WavesOverlay';
import { PopupMessageSystem } from '@/ui/PopupMessageSystem';
import { DebugOverlay } from '@/ui/overlays/DebugOverlay';
import { MiniMap } from '@/ui/overlays/MiniMap';

import { BackgroundRenderer } from '@/rendering/BackgroundRenderer';
import { MultiShipRenderer } from '@/rendering/MultiShipRenderer';
import { ShipConstructionAnimatorService } from '@/game/ship/systems/ShipConstructionAnimatorService';
import { CursorRenderer } from '@/rendering/CursorRenderer';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { LightingRenderer } from '@/lighting/LightingRenderer';

import { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import { LaserSystem } from '@/systems/physics/LaserSystem';
import { PickupSystem } from '@/systems/pickups/PickupSystem';
import { ParticleManager } from '@/systems/fx/ParticleManager';
import { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';

import { PlayerControllerSystem } from '@/systems/controls/PlayerControllerSystem';
import { MissionDialogueManager } from '@/systems/dialogue/MissionDialogueManager';
import { MovementSystem } from '@/systems/physics/MovementSystem';
import { MovementSystemRegistry } from '@/systems/physics/MovementSystemRegistry';
import { BlockObjectCollisionSystem } from '@/systems/physics/BlockObjectCollisionSystem';
import { WeaponSystem } from '@/systems/combat/WeaponSystem';
import { UtilitySystem } from '@/systems/combat/UtilitySystem';
import { PlanetSystem } from '@/game/planets/PlanetSystem';
import { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import { ShipBuilderController } from '@/systems/subsystems/ShipBuilderController';
import { CompositeBlockDestructionService } from '@/game/ship/CompositeBlockDestructionService';
import { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import { WaveSpawner } from '@/systems/wavespawner/WaveSpawner';
import { AsteroidSpawningSystem } from '@/game/spawners/AsteroidSpawningSystem';
import { AsteroidRenderer } from '@/rendering/AsteroidRenderer';
import { TurretBackend } from '@/systems/combat/backends/TurretBackend';
import { LaserBackend } from '@/systems/combat/backends/LaserBackend';
import { ExplosiveLanceBackend } from '@/systems/combat/backends/ExplosiveLanceBackend';
import { ShieldToggleBackend } from '@/systems/combat/backends/ShieldToggleBackend';
import { CombatService } from '@/systems/combat/CombatService';
import { EnergyRechargeSystem } from '@/game/ship/systems/EnergyRechargeSystem';

import { handleEngineSound } from '@/core/runtimeHelpers/handleEngineSound';
import { handleMenuInput } from '@/ui/utils/handleMenuInput';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { ShipCullingSystem } from '@/game/ship/systems/ShipCullingSystem';
import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';
import { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';
import { CompositeBlockObjectCullingSystem } from '@/game/entities/systems/CompositeBlockObjectCullingSystem';
import { CompositeBlockObjectUpdateSystem } from '@/game/entities/systems/CompositeBlockObjectUpdateSystem';
import { getStarterShip } from '@/game/ship/utils/PrefabHelpers';
import { getStarterSpaceStation } from '@/ui/menus/dev/getStarterSpaceStation';
import { Grid } from '@/systems/physics/Grid';
import { Ship } from '@/game/ship/Ship';
import { SpaceStation } from '@/game/entities/SpaceStation';

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
  private menuManager = MenuManager.getInstance();
  private shipBuilderMenu: ShipBuilderMenu
  private spaceStationBuilderMenu: SpaceStationBuilderMenu;
  private settingsMenu: SettingsMenu;
  private pauseMenu: PauseMenu;
  private hud: HudOverlay;
  private miniMap: MiniMap;

  private canvasManager: CanvasManager;
  private camera: Camera | null = null;

  private mission: MissionDefinition
  private shipRegistry = ShipRegistry.getInstance();
  private blockObjectRegistry = CompositeBlockObjectRegistry.getInstance();
  private shipCulling: ShipCullingSystem;
  private blockObjectCulling: CompositeBlockObjectCullingSystem;
  private blockObjectUpdate: CompositeBlockObjectUpdateSystem;
  private aiOrchestrator: AIOrchestratorSystem;

  private grid: Grid | null = null;
  private ship: Ship | null = null;
  private spaceStation: SpaceStation | null = null;

  private projectileSystem: ProjectileSystem;
  private laserSystem: LaserSystem;
  private pickupSystem: PickupSystem;
  private particleManager: ParticleManager;
  private background: BackgroundRenderer;
  private multiShipRenderer: MultiShipRenderer;
  private asteroidRenderer: AsteroidRenderer;
  private cursorRenderer: CursorRenderer;
  private shipConstructionAnimator: ShipConstructionAnimatorService;
  private waveSpawner: WaveSpawner;
  private asteroidSpawner: AsteroidSpawningSystem;
  private wavesOverlay: WavesOverlay;
  private popupMessageSystem: PopupMessageSystem;
  private debugOverlay: DebugOverlay;
  private lightingOrchestrator: LightingOrchestrator;

  private collisionSystem: BlockObjectCollisionSystem;
  private movement: MovementSystem;
  private weaponSystem: WeaponSystem;
  private utilitySystem: UtilitySystem;
  private planetSystem: PlanetSystem;
  private energyRechargeSystem: EnergyRechargeSystem;
  private playerController: PlayerControllerSystem;
  private shipBuilderController: ShipBuilderController;
  private spaceStationBuilderController: SpaceStationBuilderController;
  private explosionSystem: ExplosionSystem;
  private repairEffectSystem: RepairEffectSystem;
  private screenEffects: ScreenEffectsSystem;

  private engineSoundPlaying = false;

  private updatables: IUpdatable[] = [];
  private renderables: IRenderable[] = [];

  private isPaused = false;
  private isDestroyed = false;

  constructor() {
    this.canvasManager = new CanvasManager();
    this.inputManager = new InputManager(this.canvasManager.getCanvas('ui'));
    this.grid = new Grid();  // Initialize global grid
    this.gameLoop = new GameLoop();
    this.camera = new Camera(getViewportWidth(), getViewportHeight());
    
    // Persistent UI
    this.cursorRenderer = new CursorRenderer(this.canvasManager, this.inputManager);
    this.popupMessageSystem = new PopupMessageSystem(this.canvasManager);
    
    // Menus
    this.shipBuilderMenu = new ShipBuilderMenu(this.inputManager, this.cursorRenderer);
    this.settingsMenu = new SettingsMenu(this.inputManager, this.menuManager, this.canvasManager, this.camera);
    this.pauseMenu = new PauseMenu(
      this.inputManager,
      this.handlePlayerFailure.bind(this),
      this.menuManager,
    );
    this.menuManager.registerMenu('pauseMenu', this.pauseMenu);
    this.menuManager.registerMenu('settingsMenu', this.settingsMenu);
    this.menuManager.registerMenu('shipBuilderMenu', this.shipBuilderMenu);
    this.menuManager.registerPauseHandlers(this.pause.bind(this), this.resume.bind(this));

    // Lighting System
    const lightingCanvas = this.canvasManager.getCanvas('lighting');
    const lightingGL = this.canvasManager.getWebGLContext('lighting');
    const lightingRenderer = new LightingRenderer(lightingGL, lightingCanvas);
    this.lightingOrchestrator = LightingOrchestrator.getInstance(lightingRenderer, this.camera);
    const sceneLighting = missionLoader.getMission().sceneLighting ?? [0, 0, 0, 0];
    this.lightingOrchestrator.setClearColor(...sceneLighting);

    // Particle System
    this.particleManager = new ParticleManager(this.canvasManager.getContext('particles'), this.camera, this.lightingOrchestrator);
    ShieldEffectsSystem.initialize(this.canvasManager, this.camera);

    this.mission = missionLoader.getMission();
    missionResultStore.initialize();

    // Initialize player resources with starting currency
    const playerResources = PlayerResources.getInstance();
    playerResources.initialize(0); // Start with 0 currency
    const playerStats = PlayerStats.getInstance();
    playerStats.initialize(); // Start with 100 energy

    this.ship = getStarterShip(this.grid);  // Now the grid is initialized before passing to getStarterShip

    // Register player ship using the Singleton ShipRegistry
    this.shipRegistry.add(this.ship);

    // Register culling systems
    this.shipCulling = new ShipCullingSystem(this.grid, this.camera);
    this.blockObjectCulling = new CompositeBlockObjectCullingSystem(this.grid, this.camera);

    // Initialize ExplosionSystem and ScreenEffectsSystem
    this.explosionSystem = new ExplosionSystem(this.canvasManager, this.camera, this.particleManager, this.lightingOrchestrator);
    this.screenEffects = new ScreenEffectsSystem(this.canvasManager);
    
    // === Step 1: Initialize orchestrator first ===
    this.aiOrchestrator = new AIOrchestratorSystem();
    this.aiOrchestrator.registerPlayerShip(this.ship);

    // === Step 2: Construct PickupSystem and PickupSpawner (unchanged) ===
    this.pickupSystem = new PickupSystem(
      this.canvasManager, 
      this.camera, 
      this.ship, 
      this.particleManager, 
      this.screenEffects, 
      this.popupMessageSystem
    );
    const pickupSpawner = new PickupSpawner(this.pickupSystem);

    const destructionService = new CompositeBlockDestructionService(
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
    this.collisionSystem = new BlockObjectCollisionSystem(combatService);
    
    // === Step 4: Instantiate ProjectileSystem with CombatService ===
    // Deprecate this awful class and put it into the turret backend 
    this.projectileSystem = new ProjectileSystem(
      this.canvasManager,
      this.grid,
      combatService,
      this.particleManager,
      this.ship
    );

    this.laserSystem = new LaserSystem(
      this.canvasManager,
      this.camera,
      this.grid,
      combatService,
      this.particleManager,
      this.ship
    );

    // Renderers
    this.background = new BackgroundRenderer(this.canvasManager, this.camera, this.mission.environmentSettings?.backgroundId);
    this.multiShipRenderer = new MultiShipRenderer(this.canvasManager, this.camera, this.shipCulling, this.inputManager);
    this.asteroidRenderer = new AsteroidRenderer(this.canvasManager, this.camera, this.blockObjectCulling, this.inputManager);
    this.shipConstructionAnimator = new ShipConstructionAnimatorService(this.ship, this.camera, this.canvasManager);

    // Additional Update Systems
    this.blockObjectUpdate = new CompositeBlockObjectUpdateSystem(this.blockObjectRegistry);

    // Add components to player ship (Should all be abstracted into one factory)
    const emitter = new ThrusterEmitter(this.particleManager);
    this.movement = new MovementSystem(this.ship, emitter, this.collisionSystem);
    MovementSystemRegistry.register(this.ship, this.movement);
    this.weaponSystem = new WeaponSystem(
      new TurretBackend(this.projectileSystem, this.ship),
      new LaserBackend(this.laserSystem),
      new ExplosiveLanceBackend(combatService, this.particleManager, this.grid, this.explosionSystem, this.ship),
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

    // Dev
    this.spaceStationBuilderMenu = new SpaceStationBuilderMenu(this.inputManager, this.cursorRenderer);
    this.spaceStation = getStarterSpaceStation(this.grid);
    this.spaceStationBuilderController = new SpaceStationBuilderController(
      this.spaceStation, 
      this.spaceStationBuilderMenu, 
      this.camera, 
      this.repairEffectSystem,
      this.inputManager
    );

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
      this.explosionSystem,
      this.collisionSystem,
      this.shipConstructionAnimator
    );
    this.waveSpawner.setMissionCompleteHandler(() => this.handlePlayerVictory());
    destructionService.onEntityDestroyed((entity, _cause) => {
      if (entity instanceof Ship) {
        this.waveSpawner.notifyShipDestruction(entity);
      }
    });

    // Create Planet System
    this.planetSystem = new PlanetSystem(this.ship, this.inputManager, this.camera, this.canvasManager, this.waveSpawner);
    this.planetSystem.registerPlanetsFromConfigs(missionLoader.getPlanetSpawnConfigs());

    // Create AsteroidSpawner
    this.asteroidSpawner = new AsteroidSpawningSystem(this.grid, this.blockObjectRegistry);

    // Create Dialogue Manager
    this.missionDialogueManager = new MissionDialogueManager(this.inputManager, this.canvasManager, this.waveSpawner, this.ship);

    // Overlays
    this.wavesOverlay = new WavesOverlay(this.canvasManager, this.waveSpawner);
    this.debugOverlay = new DebugOverlay(this.canvasManager, this.shipRegistry, this.aiOrchestrator);
    this.hud = new HudOverlay(this.canvasManager, this.ship);
    this.miniMap = new MiniMap(this.canvasManager, this.ship, this.aiOrchestrator, this.planetSystem, getUniformScaleFactor());

    this.updatables = [
      this.movement,
      this.projectileSystem,
      this.laserSystem,
      this.particleManager,
      this.aiOrchestrator,
      this.blockObjectUpdate,
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
      this.popupMessageSystem,
      this.background,
      this.shipConstructionAnimator,
      this.planetSystem,
      this.lightingOrchestrator
    ];

    this.renderables = [
      this.background,
      this.laserSystem,
      this.pickupSystem,
      this.particleManager,
      this.multiShipRenderer,
      this.asteroidRenderer,
      this.hud,
      this.miniMap,
      this.explosionSystem,
      ShieldEffectsSystem.getInstance(),
      this.screenEffects,
      this.wavesOverlay,
      this.debugOverlay,
      this.popupMessageSystem,
      this.missionDialogueManager,
      this.shipConstructionAnimator,
      this.planetSystem,
      this.lightingOrchestrator
    ];

    this.registerLoopHandlers();
  }

  private registerLoopHandlers() {
    this.gameLoop.onUpdate(this.boundUpdate);
    this.gameLoop.onRender(this.boundRender);
  }

  private pause() {
    this.isPaused = true;
    this.waveSpawner.pause();
  }

  private resume() {
    this.isPaused = false;
    this.waveSpawner.resume();
  }

  private update = (dt: number) => {
    if (this.isDestroyed) return;

    // === Engine sound ===
    this.engineSoundPlaying = handleEngineSound(
      this.inputManager.isKeyPressed('KeyW'),
      this.engineSoundPlaying
    );

    // Toggle the ship builder menu with Tab
    handleMenuInput({
      inputManager: this.inputManager,
      pause: this.pause.bind(this),
      resume: this.resume.bind(this),
      shipBuilderMenu: this.shipBuilderMenu,
      pauseMenu: this.pauseMenu,
      settingsMenu: this.settingsMenu,
      menuManager: this.menuManager,
    });

    if (this.pauseMenu.isOpen()) {
      this.pauseMenu.update();
    }

    if (this.settingsMenu.isOpen()) {
      this.settingsMenu.update();
    }

    if (this.shipBuilderMenu.isOpen()) {
      this.shipBuilderMenu.update();
    }

    if (this.spaceStationBuilderMenu.isOpen()) {
      this.spaceStationBuilderMenu.update();
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

    if (this.inputManager.wasKeyJustPressed('KeyI')) {
      if (!this.spaceStationBuilderMenu.isOpen()) {
        this.pause();
        console.log("Opening space station builder menu...");
        this.spaceStationBuilderMenu.openMenu();
      } else {
        this.resume();
        console.log("Closing space station builder menu...");
        this.spaceStationBuilderMenu.closeMenu();
      }
    }

    // === Camera ===

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
      this.camera.update(dt);
      if (this.shipBuilderMenu.isOpen()) {
          this.shipBuilderController.update(transform);
      }
      if (this.spaceStationBuilderMenu.isOpen()) {
        if (this.spaceStation) {
          this.spaceStationBuilderController.update(this.spaceStation.getTransform());
        }
      }
    } catch (error) {
      console.error("Error getting ship transform:", error);
    }

    // Update all systems if not paused
    if (!this.isPaused) {
      this.updatables.forEach(system => system.update(dt));
    }

    // Always update these systems
    this.repairEffectSystem.update(dt);
    this.inputManager.updateFrame();
    this.missionDialogueManager.update(dt);

    // On resolution change, recreate the minimap
    // INSERT CODE HERE
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
    if (PlayerSettingsManager.getInstance().isLightingEnabled()) {
      this.canvasManager.clearWebGLLayer('lighting');
    }

    this.renderables.forEach(system => system.render(dt));

    // Always render the repair effect system
    this.repairEffectSystem.render();

    if (this.shipBuilderMenu.isOpen()) {
      this.shipBuilderController.render(this.canvasManager.getContext('entities'), transform);
      this.shipBuilderMenu.render(this.canvasManager.getContext('ui'));
    }

    if (this.spaceStationBuilderMenu.isOpen()) {
      if (this.spaceStation) {
        this.spaceStationBuilderController.render(this.canvasManager.getContext('entities'), this.spaceStation.getTransform());
        this.spaceStationBuilderMenu.render(this.canvasManager.getContext('ui'));
      }
    }

    if (this.pauseMenu.isOpen()) {
      this.pauseMenu.render(this.canvasManager.getContext('ui'));
    }

    if (this.settingsMenu.isOpen()) {
      this.settingsMenu.render(this.canvasManager.getContext('ui'));
    }

    this.cursorRenderer.render();
  };

  public async load(): Promise<void> {
    // Delegate to each subsystem that loads images
    await Promise.all([
      this.background?.load?.(),           // BackgroundRenderer
      // this.planetSystem?.load?.(),         // PlanetSystem (loads spritePath)
      // etc...
    ]);
  }

  public start() {
    this.gameLoop.start();
    this.asteroidSpawner.spawnFieldById('asteroid-field-01');
    this.inputManager.disableInput();
    setTimeout(() => {
      if (this.ship) {
        this.shipConstructionAnimator.animateShipConstruction(this.ship);
      }
    }, 1000);
    setTimeout(() => {
      this.inputManager.enableInput();
      this.missionDialogueManager.initialize();
    }, 4200);
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
    MovementSystemRegistry.clear();
    BlockToObjectIndex.clear();

    // Technology should persist between runs
    // PlayerTechnologyManager.getInstance().destroy();

    // Optional: clear UI menus, overlays
    this.hud.destroy();
    this.miniMap.destroy();
    this.lightingOrchestrator.destroy();

    // // Clear rendering and update lists
    this.updatables.length = 0;
    this.renderables.length = 0;

    // Optional: Clear event listeners from global input systems
    this.inputManager.destroy(); // or similar method
    this.menuManager.reset();

    // Null references (defensive)
    this.ship = null;
    this.camera = null;
    this.grid = null;

    console.log("EngineRuntime: Cleanup complete.");
  }
}
