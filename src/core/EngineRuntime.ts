// src/core/EngineRuntime.ts

import { Camera } from './Camera';
import { getViewportWidth, getViewportHeight, getUniformScaleFactor } from '@/config/view';
import { CanvasManager } from './CanvasManager';
import { InputManager } from './InputManager';
import { GameLoop } from './GameLoop';
import { applyViewportResolution } from '@/shared/applyViewportResolution';

import type { IUpdatable, IRenderable } from '@/core/interfaces/types';

import { missionLoader } from '@/game/missions/MissionLoader';
import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { sceneManager } from './SceneManager';
import { initializeGL2BlockSpriteCache } from '@/rendering/cache/BlockSpriteCache';
import { initializeGLPickupSpriteCache, destroyGLPickupSpriteCache } from '@/rendering/cache/PickupSpriteCache';
import { initializeGLProjectileSpriteCache, destroyGLProjectileSpriteCache } from '@/rendering/cache/ProjectileSpriteCache';
import { initializeGL2AsteroidBlockSpriteCache, destroyGL2AsteroidBlockSpriteCache } from '@/rendering/cache/AsteroidSpriteCache';
import { GlobalSpriteRequestBus } from '@/rendering/unified/bus/SpriteRenderRequestBus';

import { MenuManager } from '@/ui/MenuManager';
import { ShipBuilderMenu } from '@/ui/menus/ShipBuilderMenu';
import { SpaceStationBuilderMenu } from '@/ui/menus/dev/SpaceStationBuilderMenu';
import { SpaceStationBuilderController } from '@/ui/menus/dev/SpaceStationBuilderController';
import { BlockDropDecisionMenu } from '@/ui/menus/BlockDropDecisionMenu';
import { BlockPlacementController } from '@/ui/components/BlockPlacementController';
import { SettingsMenu } from '@/ui/menus/SettingsMenu';
import { PauseMenu } from '@/ui/menus/PauseMenu';
import { HudOverlay } from '@/ui/overlays/HudOverlay';
import { WavesOverlay } from '@/ui/overlays/WavesOverlay';
import { PopupMessageSystem } from '@/ui/PopupMessageSystem';
import { DebugOverlay } from '@/ui/overlays/DebugOverlay';
import { MiniMap } from '@/ui/overlays/MiniMap';

import { 
  addPostProcessEffect, 
  clearPostProcessEffects, 
  applyWarmCinematicEffect, 
  applyCoolCinematicEffect, 
  applyVintageFilmEffect, 
  applyLightCinematicEffect,
  applyUnderwaterEffect,
} from '@/core/interfaces/events/PostProcessingEffectReporter';

import { UnifiedSceneRendererGL } from '@/rendering/unified/UnifiedSceneRendererGL';
import { ShipConstructionAnimatorService } from '@/game/ship/systems/ShipConstructionAnimatorService';
import { CursorRenderer } from '@/rendering/CursorRenderer';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { SpriteRendererGL } from '@/rendering/gl/SpriteRendererGL';
import { FloatingTextManager } from '@/rendering/floatingtext/FloatingTextManager';

import { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import { LaserSystem } from '@/systems/physics/LaserSystem';
import { PickupSystem } from '@/systems/pickups/PickupSystem';
import { ParticleManager } from '@/systems/fx/ParticleManager';
import { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';

import { PlayerControllerSystem } from '@/systems/controls/PlayerControllerSystem';
import { MissionDialogueManager } from '@/systems/dialogue/MissionDialogueManager';
import { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';
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
import { IncidentOrchestrator } from '@/systems/incidents/IncidentOrchestrator';
import { AsteroidSpawningSystem } from '@/game/spawners/AsteroidSpawningSystem';
import { TurretBackend } from '@/systems/combat/backends/weapons/TurretBackend';
import { LaserBackend } from '@/systems/combat/backends/weapons/LaserBackend';
import { HaloBladeBackend } from '@/systems/combat/backends/weapons/HaloBladeBackend';
import { ExplosiveLanceBackend } from '@/systems/combat/backends/weapons/ExplosiveLanceBackend';
import { ShieldToggleBackend } from '@/systems/combat/backends/utility/ShieldToggleBackend';
import { CombatService } from '@/systems/combat/CombatService';
import { EnergyRechargeSystem } from '@/game/ship/systems/EnergyRechargeSystem';

import { handleEngineSound } from '@/core/runtimeHelpers/handleEngineSound';
import { handleMenuInput } from '@/ui/utils/handleMenuInput';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { ShipCullingSystem } from '@/game/ship/systems/ShipCullingSystem';
import { ShipGrid } from '@/game/ship/ShipGrid';
import { CompositeBlockObjectGrid } from '@/game/entities/CompositeBlockObjectGrid';
import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';
import { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';
import { CompositeBlockObjectCullingSystem } from '@/game/entities/systems/CompositeBlockObjectCullingSystem';
import { CompositeBlockObjectUpdateSystem } from '@/game/entities/systems/CompositeBlockObjectUpdateSystem';
import { getStarterShip } from '@/game/ship/utils/PrefabHelpers';
import { getStarterSpaceStation } from '@/ui/menus/dev/getStarterSpaceStation';
import { Grid } from '@/systems/physics/Grid';
import { Ship } from '@/game/ship/Ship';
import { SpaceStation } from '@/game/entities/SpaceStation';

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import { ShieldEffectsSystem } from '@/systems/fx/ShieldEffectsSystem';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import { ScreenEffectsSystem } from '@/systems/fx/ScreenEffectsSystem';

import { PlayerResources } from '@/game/player/PlayerResources';
import { PlayerStats } from '@/game/player/PlayerStats';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';
import { flags } from '@/game/player/PlayerFlagManager';

// Debug
import { getBlockType } from '@/game/blocks/BlockRegistry';

export class EngineRuntime {
  private gameLoop: GameLoop;
  private readonly boundUpdate = (dt: number) => this.update(dt);
  private readonly boundRender = (dt: number) => this.render(dt);

  private inputManager: InputManager;
  private missionDialogueManager: MissionDialogueManager;
  private coachMarkManager: CoachMarkManager;
  private menuManager = MenuManager.getInstance();
  private shipBuilderMenu: ShipBuilderMenu
  private spaceStationBuilderMenu: SpaceStationBuilderMenu;
  private settingsMenu: SettingsMenu;
  private blockDropDecisionMenu: BlockDropDecisionMenu;
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
  private shipGrid: ShipGrid | null = null;
  private objectGrid: CompositeBlockObjectGrid<CompositeBlockObject> | null = null;
  private spaceStation: SpaceStation | null = null;

  private projectileSystem: ProjectileSystem;
  private laserSystem: LaserSystem;
  private pickupSystem: PickupSystem;
  private particleManager: ParticleManager;
  private unifiedSceneRenderer: UnifiedSceneRendererGL;
  private cursorRenderer: CursorRenderer;
  private floatingTextManager: FloatingTextManager;
  private shipConstructionAnimator: ShipConstructionAnimatorService;
  private waveSpawner: WaveSpawner;
  private incidentOrchestrator: IncidentOrchestrator;
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
  private blockPlacementController: BlockPlacementController;
  private spaceStationBuilderController: SpaceStationBuilderController;
  private explosionSystem: ExplosionSystem;
  private shipBuilderEffects: ShipBuilderEffectsSystem;
  private screenEffects: ScreenEffectsSystem;

  private engineSoundPlaying = false;

  private updatables: IUpdatable[] = [];
  private renderables: IRenderable[] = [];

  private isPaused = false;
  private isDestroyed = false;

  constructor() {
    this.canvasManager = CanvasManager.getInstance();
    this.inputManager = new InputManager(this.canvasManager.getCanvas('ui'));
    this.grid = new Grid();  // Initialize global grid
    this.gameLoop = new GameLoop();
    this.camera = Camera.getInstance(getViewportWidth(), getViewportHeight());
    this.shipGrid = new ShipGrid(3000);
    this.objectGrid = new CompositeBlockObjectGrid(3000);

    // Initialize GL caches
    initializeGLProjectileSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    initializeGL2BlockSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    initializeGLPickupSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    initializeGL2AsteroidBlockSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2')); // Just added this

    // Resolution fix for electron
    applyViewportResolution(this.canvasManager, this.camera);

    // Persistent UI
    this.popupMessageSystem = new PopupMessageSystem(this.canvasManager);
  
    // Lighting System
    this.lightingOrchestrator = LightingOrchestrator.getInstance();

    // Particle System
    this.particleManager = new ParticleManager(this.lightingOrchestrator);
    ShieldEffectsSystem.initialize(this.canvasManager, this.camera);

    this.mission = missionLoader.getMission();
    missionResultStore.initialize();

    // Initialize player resources with starting currency
    const playerResources = PlayerResources.getInstance();
    playerResources.initialize(0); // Start with 0 currency
    const playerStats = PlayerStats.getInstance();
    playerStats.initialize(); // Start with 100 energy

    // Get starter ship, TODO: Replace this with user's selected starter ship
    this.ship = getStarterShip(this.grid);

    // Register player ship using the Singleton ShipRegistry
    this.shipRegistry.add(this.ship);
    this.shipRegistry.setPlayerShip(this.ship);

    // Register culling systems
    this.shipCulling = new ShipCullingSystem(this.shipGrid);
    this.blockObjectCulling = new CompositeBlockObjectCullingSystem(this.objectGrid);

    // Initialize ExplosionSystem and ScreenEffectsSystem
    this.explosionSystem = new ExplosionSystem(this.canvasManager, this.camera, this.particleManager, this.lightingOrchestrator);
    this.screenEffects = new ScreenEffectsSystem(this.canvasManager);
    this.shipBuilderEffects = new ShipBuilderEffectsSystem(this.canvasManager, this.camera);
    
    // === Cursor
    this.cursorRenderer = new CursorRenderer(this.canvasManager, this.inputManager, this.ship);

    // === AI Orchestrator
    this.aiOrchestrator = new AIOrchestratorSystem(this.shipGrid);
    this.aiOrchestrator.registerPlayerShip(this.ship);

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
    this.shipBuilderController = new ShipBuilderController(
      this.ship, 
      this.shipBuilderMenu, 
      this.camera, 
      this.shipBuilderEffects,
      this.inputManager
    );
    this.shipBuilderMenu.setRepairAllHandler(() => {
      this.shipBuilderController.repairAllBlocks();
    });
    this.blockDropDecisionMenu = new BlockDropDecisionMenu(
      this.ship,
      this.inputManager, 
      this.shipBuilderEffects,
      this.pause.bind(this), 
      this.resume.bind(this)
    );
    this.blockPlacementController = new BlockPlacementController(
      this.ship,
      this.blockDropDecisionMenu,
      this.camera,
      this.shipBuilderEffects,
      this.inputManager
    );

    // === Construct PickupSystem and PickupSpawner ===
    this.pickupSystem = new PickupSystem(
      this.camera, 
      this.ship, 
      this.particleManager, 
      this.screenEffects, 
      this.popupMessageSystem,
      this.shipBuilderEffects,
      this.blockDropDecisionMenu
    );
    const pickupSpawner = new PickupSpawner(this.pickupSystem);

    // === Destruction and Combat Services
    const destructionService = new CompositeBlockDestructionService(
      this.explosionSystem,
      pickupSpawner,
      this.shipRegistry,
      this.aiOrchestrator,
    );

    this.floatingTextManager = new FloatingTextManager();
    const combatService = new CombatService(
      this.explosionSystem,
      pickupSpawner,
      destructionService,
      this.floatingTextManager
    );

    // Collision System
    this.collisionSystem = new BlockObjectCollisionSystem(combatService);
    
    // === Shared ship systems ===
    // Deprecate this awful class and put it into the turret backend 
    // Projectile system (Single instance shared by all ships)
    this.projectileSystem = new ProjectileSystem(
      this.canvasManager,
      this.grid,
      combatService,
      this.particleManager,
      this.ship
    );
    // Laser system (Single instance shared by all ships)
    this.laserSystem = new LaserSystem(
      this.canvasManager,
      this.camera,
      this.grid,
      combatService,
      this.particleManager,
      this.ship
    );
    // Energy Recharge System: Single instance used by all ships
    this.energyRechargeSystem = new EnergyRechargeSystem(this.shipRegistry);

    // Renderers
    // this.asteroidRenderer = new AsteroidRenderer(this.canvasManager, this.camera, this.blockObjectCulling, this.inputManager);
    this.shipConstructionAnimator = new ShipConstructionAnimatorService(this.ship, this.camera, this.canvasManager);
    this.unifiedSceneRenderer = new UnifiedSceneRendererGL(this.camera, this.inputManager);
    this.unifiedSceneRenderer.setAmbientLight([0.4, 0.4, 0.4]);
    this.unifiedSceneRenderer.setBackgroundImage(this.mission.environmentSettings?.backgroundId ?? null);

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
      new HaloBladeBackend(combatService, this.particleManager, this.grid, this.ship)
    );
    this.utilitySystem = new UtilitySystem(
      new ShieldToggleBackend()
    );

    // Player controls
    this.playerController = new PlayerControllerSystem(this.camera, this.inputManager, this.cursorRenderer, this.ship);

    // Dev Tools
    this.spaceStationBuilderMenu = new SpaceStationBuilderMenu(this.inputManager, this.cursorRenderer);
    this.spaceStation = getStarterSpaceStation(this.grid);
    this.spaceStationBuilderController = new SpaceStationBuilderController(
      this.spaceStation, 
      this.spaceStationBuilderMenu, 
      this.camera, 
      this.shipBuilderEffects,
      this.inputManager
    );

    // == Enemy Wave Spawning System and Incident System
    this.incidentOrchestrator = new IncidentOrchestrator({
      canvasManager: this.canvasManager,
      camera: this.camera,
      inputManager: this.inputManager,
      playerShip: this.ship,
      aiOrchestrator: this.aiOrchestrator,
      popupMessageSystem: this.popupMessageSystem,
    });

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
      this.shipConstructionAnimator,
      this.incidentOrchestrator,
      this.popupMessageSystem,
    );
    this.waveSpawner.setMissionCompleteHandler(() => this.handlePlayerVictory());
    destructionService.onEntityDestroyed((entity, _cause) => {
      if (entity instanceof Ship) {
        this.waveSpawner.notifyShipDestruction(entity);
      }
    });

    // Planet System
    this.planetSystem = new PlanetSystem(this.ship, this.inputManager, this.camera, this.canvasManager, this.waveSpawner, this.unifiedSceneRenderer);
    this.planetSystem.registerPlanetsFromConfigs(missionLoader.getPlanetSpawnConfigs());

    // AsteroidSpawner
    this.asteroidSpawner = new AsteroidSpawningSystem(this.grid, this.blockObjectRegistry, this.objectGrid);

    // Dialogue Manager
    this.coachMarkManager = CoachMarkManager.getInstance();
    this.missionDialogueManager = new MissionDialogueManager(
      this.inputManager, 
      this.canvasManager, 
      this.waveSpawner, 
      this.ship,
      this.coachMarkManager
    );

    // Overlay Displays (UI HUD)
    this.wavesOverlay = new WavesOverlay(this.canvasManager, this.waveSpawner);
    this.debugOverlay = new DebugOverlay(this.canvasManager, this.shipRegistry, this.aiOrchestrator, this.shipGrid, this.objectGrid);
    this.hud = new HudOverlay(this.canvasManager, this.ship, this.floatingTextManager, this.blockDropDecisionMenu, this.inputManager);
    this.miniMap = new MiniMap(this.canvasManager, this.ship, this.aiOrchestrator, this.planetSystem, getUniformScaleFactor());

    // All systems that need to be updated every frame
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
          // Player Ship's update
          const intent: ShipIntent = this.playerController.getIntent();
          this.movement.setIntent(intent.movement);
          this.weaponSystem.setIntent(intent.weapons);
          this.utilitySystem.setIntent(intent.utility);

          try {
            this.weaponSystem.update(dt, this.ship, this.ship.getTransform());
            this.utilitySystem.update(dt, this.ship, this.ship.getTransform());
            this.ship.getAfterburnerComponent()?.update(dt);
          } catch (error) {
            console.error("Error updating system:", error);
          }
        }
      },
      this.popupMessageSystem,
      this.shipConstructionAnimator,
      this.planetSystem,
      this.lightingOrchestrator,
    ];

    // All systems that need to be rendered every frame
    this.renderables = [
      this.laserSystem,
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
      this.aiOrchestrator,
      this.floatingTextManager,
      this.coachMarkManager,
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

    // === Engine sound === TODO: Move this elsewhere, shouldn't fire on pause
    this.engineSoundPlaying = handleEngineSound(
      this.inputManager.isKeyPressed('KeyW'),
      this.engineSoundPlaying
    );

    // Handle Menu Input
    handleMenuInput({
      inputManager: this.inputManager,
      pause: this.pause.bind(this),
      resume: this.resume.bind(this),
      shipBuilderMenu: this.shipBuilderMenu,
      pauseMenu: this.pauseMenu,
      settingsMenu: this.settingsMenu,
      blockDropDecisionMenu: this.blockDropDecisionMenu,
      menuManager: this.menuManager,
    });

    // TODO: Move this elsewhere
    if (this.blockDropDecisionMenu.isOpen()) {
      this.blockDropDecisionMenu.update(dt);
      if (this.ship) {
        this.blockPlacementController.update(this.ship.getTransform());
      }
    }

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
    if (this.inputManager.wasKeyJustPressed('Digit2')) {
      flags.unlockAllFlags();
    }

    if (this.inputManager.wasKeyJustPressed('KeyG')) {
      addPostProcessEffect('bloom');
      addPostProcessEffect('chromaticAberration');
    }

    if (this.inputManager.wasKeyJustPressed('Digit4')) {
      applyWarmCinematicEffect();
    }

    if (this.inputManager.wasKeyJustPressed('Digit5')) {
      applyCoolCinematicEffect();
    }

    if (this.inputManager.wasKeyJustPressed('Digit6')) {
      applyVintageFilmEffect();
    }

    if (this.inputManager.wasKeyJustPressed('Digit7')) {
      applyLightCinematicEffect();
    }

    if (this.inputManager.wasKeyJustPressed('KeyH')) {
      clearPostProcessEffects();
    }

    if (this.inputManager.wasKeyJustPressed('Digit1')) {
      // const randomTypes = ['engine1', 'engine2', 'engine3', 'engine4', 'hull1', 'hull2', 'hull3', 'fin1', 'fin2', 'facetplate1', 'facetplate2', 'turret1', 'turret2', 'turret3', 'turret4', 'laser1', 'harvester1', 'battery1', 'shield1', 'turret2', 'fuelTank1'];
      // const randomTypes = ['fuelTank1', 'fuelTank2', 'fuelTank3', 'fuelTank4'];
      // const randomTypes = ['haloBlade1', 'haloBlade2', 'haloBlade3', 'haloBlade4'];
      // const randomTypes = ['engine1', 'engine2', 'engine3', 'engine4'];
      const randomTypes = ['engine4', 'hull4', 'fin4', 'facetplate4', 'turret4', 'laser1', 'battery2', 'shield2', 'harvester1', 'explosiveLance1', 'haloBlade3', 'haloBlade4'];
      for (let i = 0; i < 20; i++) {
        this.blockDropDecisionMenu.enqueueBlock(getBlockType(randomTypes[Math.floor(Math.random() * randomTypes.length)])!);
      }
      // this.blockDropDecisionMenu.enqueueBlock(getBlockType(randomTypes[Math.floor(Math.random() * randomTypes.length)])!);
    }

    if (this.inputManager.wasKeyJustPressed('KeyN')) {
      if (this.waveSpawner.getIsPaused()) {
        this.waveSpawner.resume();
      } else {
        this.waveSpawner.pause();
      }
    }

    if (this.inputManager.wasKeyJustPressed('Digit0')) {
      PlayerResources.getInstance().addCurrency(1000);
    }

    if (this.inputManager.wasKeyJustPressed('KeyO')) {
      if (this.shipBuilderMenu.isOpen()) {
        this.shipBuilderMenu.closeMenu();
        this.resume();
      } else {
        this.pause();
        this.shipBuilderMenu.openMenu();
      }
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

    // Always update these systems regardless of pause state
    this.hud.update(dt);
    this.shipBuilderEffects.update(dt);
    this.inputManager.updateFrame();
    this.missionDialogueManager.update(dt);
    this.floatingTextManager.update(dt);
    this.coachMarkManager.update(dt);
  };

  private render = (dt: number) => {
    if (!this.ship || this.isDestroyed) return;
    const transform = this.ship.getTransform();

    this.canvasManager.clearLayer('fx');
    this.canvasManager.clearLayer('particles');
    this.canvasManager.clearLayer('ui');
    this.canvasManager.clearLayer('overlay');
    this.canvasManager.clearLayer('dialogue');

    this.renderables.forEach(system => system.render(dt));

    // Render all graphics through Unified Rendering Pipeline
    if (this.camera) {
      const visibleBlockObjects = this.blockObjectCulling.getVisibleObjects();
      const visibleShips = this.shipCulling.getVisibleShips();
      const visibleLights = this.lightingOrchestrator.collectVisibleLights(this.camera);
      const activeParticles = this.particleManager.getActiveParticles();
      const spriteRequests = GlobalSpriteRequestBus.getAndClear();

      const visibleObjects = [...visibleBlockObjects, ...visibleShips, this.ship];

      this.unifiedSceneRenderer.render(
        this.camera,
        visibleObjects,
        visibleLights,
        spriteRequests,
        activeParticles
      );
    }

    // Always render the repair effect system
    this.shipBuilderEffects.render();

    if (this.shipBuilderMenu.isOpen()) {
      this.shipBuilderController.render(this.canvasManager.getContext('entities'), transform);
      this.shipBuilderMenu.render(this.canvasManager.getContext('ui'));
    }

    if (this.blockDropDecisionMenu.isOpen()) {
      this.blockDropDecisionMenu.render(this.canvasManager.getContext('ui'));
      this.blockPlacementController.render(this.canvasManager.getContext('entities'), transform);
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
      // TODO: Do we need to call setBackgroundImageId on the unified scene renderer?
      // this.background?.load?.(),           // BackgroundRenderer
      // this.planetSystem?.load?.(),         // PlanetSystem (loads spritePath)
      // etc...
    ]);
  }

  /**
   * Starts the game loop and initializes the mission.
  **/
  public start() {
    this.gameLoop.start();
    this.asteroidSpawner.spawnFieldById('asteroid-field-01');
    this.inputManager.disableAllActions();
    // TODO : Put this in options
    applyUnderwaterEffect();
    applyWarmCinematicEffect();
    setTimeout(() => {
      if (this.ship) {
        this.shipConstructionAnimator.animateShipConstruction(this.ship, { color: '#ADD8E6', radius: 96, intensity: 1.25 });
      }
    }, 1000);
    setTimeout(() => {
      this.inputManager.enableAllActions();
      this.missionDialogueManager.initialize();
    }, 4200);
  }

  public handlePlayerVictory(timeoutMs: number = 10_000): void {
    console.log("Player victorious — debriefing will begin in 10 seconds...");
    setTimeout(() => {
      clearPostProcessEffects();
      addPostProcessEffect('sepia');
    }, timeoutMs - 5)

    // Optional: trigger victory effects here (e.g. music, overlay)
    // victoryEffectManager.play(); // hypothetical example

    setTimeout(() => {
      missionResultStore.finalize('victory', this.gameLoop.getElapsedSeconds());
      this.destroy();
      sceneManager.setScene('debriefing');
    }, timeoutMs);
  }

  public handlePlayerFailure(): void {
    clearPostProcessEffects();
    addPostProcessEffect('sepia');
    console.log("Player defeated — transitioning to debriefing screen.");
    missionResultStore.finalize('defeat', this.gameLoop.getElapsedSeconds());
    this.destroy();
    sceneManager.setScene('debriefing');
  }

  /**
  * Destroys the runtime and all associated systems.
  * Always called when returning to the Hub zone.
  **/
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
    PlayerResources.getInstance().postMissionClear();
    PlayerStats.getInstance().destroy();
    MovementSystemRegistry.clear();
    BlockToObjectIndex.clear();
    Camera.destroy();
    MenuManager.getInstance().reset();
    CoachMarkManager.getInstance().clear();
    SpriteRendererGL.destroyInstance();

    // Optional: clear UI menus, overlays
    this.cursorRenderer.destroy();
    this.hud.destroy();
    this.miniMap.destroy();
    this.lightingOrchestrator.destroy();
    this.missionDialogueManager.destroy();
    this.blockDropDecisionMenu.destroy();
    // TODO : Destroy GL2 blocksprite cache?? Leaving undestroyed for use by Debriefing Scene
    destroyGLProjectileSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    destroyGLPickupSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    destroyGL2AsteroidBlockSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));

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
