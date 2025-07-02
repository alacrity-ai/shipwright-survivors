// src/core/EngineRuntime.ts

import { Camera } from './Camera';
import { getViewportWidth, getViewportHeight, getUniformScaleFactor } from '@/config/view';
import { CanvasManager } from './CanvasManager';
import { InputManager } from './InputManager';
import { audioManager } from '@/audio/Audio';
import { GameLoop } from './GameLoop';
import { applyViewportResolution } from '@/shared/applyViewportResolution';
import { GlobalEventBus } from './EventBus';
import { PlayerExperienceManager } from '@/game/player/PlayerExperienceManager';

import type { IUpdatable, IRenderable } from '@/core/interfaces/types';

import { shakeCamera } from './interfaces/events/CameraReporter';
import { spawnSpecialFx } from './interfaces/events/SpecialFxReporter';
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
import { PowerupSelectionMenu } from '@/game/powerups/ui/PowerupSelectionMenu';
import { SpaceStationBuilderMenu } from '@/ui/menus/dev/SpaceStationBuilderMenu';
import { SpaceStationBuilderController } from '@/ui/menus/dev/SpaceStationBuilderController';
import { TradePostMenu } from '@/game/tradepost/TradePostMenu';
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
import { WaveOrchestratorFactory } from '@/game/waves/WaveOrchestratorFactory';
import { WaveOrchestrator } from '@/game/waves/orchestrator/WaveOrchestrator';
import { IncidentOrchestrator } from '@/systems/incidents/IncidentOrchestrator';
import { AsteroidSpawningSystem } from '@/game/spawners/AsteroidSpawningSystem';

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
import { getStarterShip, getStarterShipFromJson } from '@/game/ship/utils/PrefabHelpers';
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

import { PowerupRegistry } from '@/game/powerups/registry/PowerupRegistry';
import { PlayerResources } from '@/game/player/PlayerResources';
import { PlayerStats } from '@/game/player/PlayerStats';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';
import { PlayerPowerupManager } from '@/game/player/PlayerPowerupManager';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { flags } from '@/game/player/PlayerFlagManager';

// Debug
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { testActivePowerupEffectResolver } from '@/game/powerups/test/poweruptest';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { spawnShipBlueprint } from './interfaces/events/PickupSpawnReporter';

export class EngineRuntime {
  private gameLoop: GameLoop;
  private readonly boundUpdate = (dt: number) => this.update(dt);
  private readonly boundRender = (dt: number) => this.render(dt);
  private boundHandleVictory = () => this.handlePlayerVictory();
  private boundHandleDefeat = () => this.handlePlayerFailure();
  private boundHandleLevelUp = () => this.handlePlayerLevelUp();
  private boundPause = () => this.pause();
  private boundResume = () => this.resume();

  private isInitialized = false;

  private inputManager: InputManager;
  private missionDialogueManager: MissionDialogueManager | null = null;
  private coachMarkManager: CoachMarkManager | null = null;
  private menuManager = MenuManager.getInstance();
  private shipBuilderMenu: ShipBuilderMenu
  private powerupSelectionMenu: PowerupSelectionMenu;
  private spaceStationBuilderMenu: SpaceStationBuilderMenu | null = null;
  private tradePostMenu: TradePostMenu;
  private settingsMenu: SettingsMenu | null = null;
  private blockDropDecisionMenu: BlockDropDecisionMenu;
  private pauseMenu: PauseMenu | null = null;
  private hud: HudOverlay | null = null;
  private miniMap: MiniMap | null = null;

  private canvasManager: CanvasManager;
  private camera: Camera | null = null;

  private mission: MissionDefinition
  private shipRegistry = ShipRegistry.getInstance();
  private blockObjectRegistry = CompositeBlockObjectRegistry.getInstance();
  private shipCulling: ShipCullingSystem | null = null;
  private blockObjectCulling: CompositeBlockObjectCullingSystem | null = null;
  private blockObjectUpdate: CompositeBlockObjectUpdateSystem | null = null;
  private aiOrchestrator: AIOrchestratorSystem;

  private grid: Grid | null = null;
  private ship: Ship | null = null;
  private shipGrid: ShipGrid | null = null;
  private objectGrid: CompositeBlockObjectGrid<CompositeBlockObject> | null = null;
  private spaceStation: SpaceStation | null = null;

  private combatService: CombatService;
  private destructionService: CompositeBlockDestructionService;
  private projectileSystem: ProjectileSystem;
  private laserSystem: LaserSystem;
  private pickupSystem: PickupSystem;
  private pickupSpawner: PickupSpawner;
  private particleManager: ParticleManager;
  private persistentParticleManager: ParticleManager;
  private unifiedSceneRenderer: UnifiedSceneRendererGL | null = null;
  private cursorRenderer: CursorRenderer;
  private floatingTextManager: FloatingTextManager;
  private shipConstructionAnimator: ShipConstructionAnimatorService;
  private waveOrchestrator: WaveOrchestrator | null = null;
  private incidentOrchestrator: IncidentOrchestrator | null = null;
  private asteroidSpawner: AsteroidSpawningSystem | null = null;
  private wavesOverlay: WavesOverlay | null = null;
  private popupMessageSystem: PopupMessageSystem | null = null;
  private debugOverlay: DebugOverlay | null = null;
  private lightingOrchestrator: LightingOrchestrator;

  private collisionSystem: BlockObjectCollisionSystem;
  private movement: MovementSystem | null = null;
  private weaponSystem: WeaponSystem | null = null;
  private utilitySystem: UtilitySystem | null = null;
  private planetSystem: PlanetSystem | null = null;
  private energyRechargeSystem: EnergyRechargeSystem | null = null;
  private playerController: PlayerControllerSystem | null = null;
  private shipBuilderController: ShipBuilderController;
  private blockPlacementController: BlockPlacementController;
  private spaceStationBuilderController: SpaceStationBuilderController | null = null;
  private explosionSystem: ExplosionSystem;
  private shipBuilderEffects: ShipBuilderEffectsSystem;
  private screenEffects: ScreenEffectsSystem;

  private engineSoundPlaying = false;

  private updatables: IUpdatable[] = [];
  private fixedUpdatables: IUpdatable[] = [];
  private dynamicUpdatables: IUpdatable[] = [];
  private renderables: IRenderable[] = [];

  private levelingUpAnimationTimer = 0;
  private isPaused = false;
  private isDestroyed = false;

  constructor() {
    this.canvasManager = CanvasManager.getInstance();
    this.inputManager = new InputManager(this.canvasManager.getCanvas('ui'));
    this.grid = new Grid();  // Initialize global grid
    this.gameLoop = new GameLoop();
    this.camera = Camera.getInstance(getViewportWidth(), getViewportHeight());
    this.shipGrid = ShipGrid.getInstance();
    this.objectGrid = new CompositeBlockObjectGrid(3000);

    PowerupRegistry.initialize();

    GlobalEventBus.on('player:victory', this.boundHandleVictory);
    GlobalEventBus.on('player:defeat', this.boundHandleDefeat);
    GlobalEventBus.on('player:entropium:levelup', this.boundHandleLevelUp);
    GlobalEventBus.on('runtime:pause', this.boundPause);
    GlobalEventBus.on('runtime:resume', this.boundResume);

    // Initialize GL caches
    initializeGLProjectileSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    initializeGL2BlockSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    initializeGLPickupSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    initializeGL2AsteroidBlockSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2')); // Just added this

    // Resolution fix for electron
    applyViewportResolution(this.canvasManager, this.camera);

    // Persistent UI
    this.popupMessageSystem = new PopupMessageSystem();
  
    // Lighting System
    this.lightingOrchestrator = LightingOrchestrator.getInstance();

    // Particle System
    this.particleManager = new ParticleManager(this.lightingOrchestrator);
    // Particle System which runs regardless of game pause
    this.persistentParticleManager = new ParticleManager(this.lightingOrchestrator);

    ShieldEffectsSystem.initialize(this.canvasManager, this.camera);

    this.mission = missionLoader.getMission();
    missionResultStore.initialize();

    // Initialize player resources with starting currency
    const playerResources = PlayerResources.getInstance();
    playerResources.initialize(0); // Start with 0 currency
    const playerStats = PlayerStats.getInstance();
    playerStats.initialize(); // Start with 100 energy

    // Initialize ExplosionSystem and ScreenEffectsSystem
    this.explosionSystem = new ExplosionSystem(this.canvasManager, this.camera, this.particleManager, this.lightingOrchestrator);
    this.screenEffects = new ScreenEffectsSystem(this.canvasManager);
    this.shipBuilderEffects = new ShipBuilderEffectsSystem(this.persistentParticleManager);
    
    // === Cursor
    this.cursorRenderer = new CursorRenderer(this.canvasManager, this.inputManager);

    // === Ship Builder (For Edit  Mode)
    this.shipBuilderMenu = new ShipBuilderMenu(this.inputManager, this.cursorRenderer);
    this.shipBuilderMenu.setSetShipHandlerFromObject((jsonData) => {
      this.setShip(jsonData);
    });
    this.shipBuilderController = new ShipBuilderController(
      this.shipBuilderMenu, 
      this.camera, 
      this.shipBuilderEffects,
      this.inputManager
    );
    this.shipBuilderMenu.setRepairAllHandler(() => {
      this.shipBuilderController.repairAllBlocks();
    });

    // === Powerup (On level up) Menu
    this.powerupSelectionMenu = new PowerupSelectionMenu(this.inputManager, this.cursorRenderer, (selectedNode) => {
      this.resume();
      this.inputManager.enableAction('pause');
      this.inputManager.enableAction('openShipBuilder');
    });

    // === Block Drop Decision Menu
    this.blockDropDecisionMenu = new BlockDropDecisionMenu(
      this.inputManager, 
      this.shipBuilderEffects,
      this.pause.bind(this), 
      this.resume.bind(this)
    );
    this.blockPlacementController = new BlockPlacementController(
      this.blockDropDecisionMenu,
      this.camera,
      this.shipBuilderEffects,
      this.inputManager
    );

    // === Trade Post Menu
    this.tradePostMenu = new TradePostMenu(this.inputManager);

    // === AI Orchestrator
    this.aiOrchestrator = new AIOrchestratorSystem();

    // === Construct PickupSystem and PickupSpawner ===
    this.pickupSystem = new PickupSystem(
      this.camera, 
      this.particleManager, 
      this.screenEffects, 
      this.popupMessageSystem,
      this.shipBuilderEffects,
      this.blockDropDecisionMenu
    );
    this.pickupSpawner = new PickupSpawner(this.pickupSystem);

    // === Destruction and Combat Services
    this.destructionService = new CompositeBlockDestructionService(
      this.explosionSystem,
      this.pickupSpawner,
      this.shipRegistry,
      this.aiOrchestrator,
    );
    
    this.floatingTextManager = new FloatingTextManager();
    this.combatService = new CombatService(
      this.explosionSystem,
      this.pickupSpawner,
      this.destructionService,
      this.shipBuilderEffects,
      this.floatingTextManager,
    );
    
    // Collision System
    this.collisionSystem = new BlockObjectCollisionSystem(this.combatService);

    this.projectileSystem = new ProjectileSystem(
      this.canvasManager,
      this.grid,
      this.combatService,
      this.particleManager,
    );
    // Laser system (Single instance shared by all ships)
    this.laserSystem = new LaserSystem(
      this.canvasManager,
      this.camera,
      this.grid,
      this.combatService,
    );
    this.shipConstructionAnimator = new ShipConstructionAnimatorService(this.shipBuilderEffects);

    this.registerLoopHandlers();
  }

  public async initialize(): Promise<void> {
    // === Player Ship
    const activeShipFilepath = PlayerShipCollection.getInstance().getActiveShipFilepath();

    const { ship, controller, emitter, movement, weapons, utility } = await getStarterShip(
      this.grid!,
      this.shipRegistry,
      this.particleManager,
      this.projectileSystem,
      this.laserSystem,
      this.combatService,
      this.explosionSystem,
      this.collisionSystem,
      this.shipConstructionAnimator,
      activeShipFilepath
    );

    this.ship = ship
    this.movement = movement; // Movement system needed for update() loop
    this.weaponSystem = weapons; // Weapon system needed for update() loop
    this.utilitySystem = utility; // Utility system needed for update() loop

    // Enqueue starting blocks from Ship Skill Tree if applicable
    PlayerResources.getInstance().enqueueSkillTreeStartingBlocks(this.ship);

    // Player controller (input)
    this.playerController = new PlayerControllerSystem(this.camera!, this.inputManager, this.cursorRenderer, this.ship);

    // Register ship to:
    this.pickupSystem.setPlayerShip(this.ship);
    this.cursorRenderer.setPlayerShip(this.ship);
    this.shipBuilderController.setPlayerShip(this.ship);
    this.blockPlacementController.setPlayerShip(this.ship);
    this.blockDropDecisionMenu.setPlayerShip(this.ship);
    this.aiOrchestrator.registerPlayerShip(this.ship);
    this.shipConstructionAnimator.setPlayerShip(this.ship);
    MovementSystemRegistry.register(this.ship, this.movement); // TODO : This may be needed for player ship?

    // Register culling systems
    this.shipCulling = new ShipCullingSystem();
    this.blockObjectCulling = new CompositeBlockObjectCullingSystem(this.objectGrid!);

    // Menus
    this.settingsMenu = new SettingsMenu(this.inputManager, this.menuManager, this.canvasManager, this.camera!);
    this.pauseMenu = new PauseMenu(
      this.inputManager,
      this.handlePlayerFailure.bind(this),
      this.menuManager,
    );
    this.menuManager.registerMenu('pauseMenu', this.pauseMenu);
    this.menuManager.registerMenu('settingsMenu', this.settingsMenu);
    this.menuManager.registerMenu('shipBuilderMenu', this.shipBuilderMenu);
    this.menuManager.registerPauseHandlers(this.pause.bind(this), this.resume.bind(this));

    // Energy Recharge System: Single instance used by all ships
    this.energyRechargeSystem = new EnergyRechargeSystem(this.shipRegistry);

    // Renderers
    this.unifiedSceneRenderer = new UnifiedSceneRendererGL(this.camera!, this.inputManager);
    this.unifiedSceneRenderer.setAmbientLight([0.4, 0.4, 0.4]);
    this.unifiedSceneRenderer.setBackgroundImage(this.mission.environmentSettings?.backgroundId ?? null);

    // Additional Update Systems
    this.blockObjectUpdate = new CompositeBlockObjectUpdateSystem(this.blockObjectRegistry);

    // Dev Tools
    this.spaceStationBuilderMenu = new SpaceStationBuilderMenu(this.inputManager, this.cursorRenderer);
    this.spaceStation = getStarterSpaceStation(this.grid!);
    this.spaceStationBuilderController = new SpaceStationBuilderController(
      this.spaceStation, 
      this.spaceStationBuilderMenu, 
      this.camera!, 
      this.shipBuilderEffects,
      this.inputManager
    );

    // == Enemy Wave Spawning System and Incident System
    this.incidentOrchestrator = new IncidentOrchestrator({
      canvasManager: this.canvasManager,
      camera: this.camera!,
      inputManager: this.inputManager,
      aiOrchestrator: this.aiOrchestrator,
      popupMessageSystem: this.popupMessageSystem!,
    });

    this.waveOrchestrator = WaveOrchestratorFactory.create(
      this.mission.waves,
      this.grid!,
      this.shipRegistry,
      this.aiOrchestrator,
      this.particleManager,
      this.projectileSystem,
      this.laserSystem,
      this.combatService,
      this.explosionSystem,
      this.collisionSystem,
      this.shipConstructionAnimator,
      this.incidentOrchestrator,
      this.popupMessageSystem!
    );

    // Notify wave orchestrator when a ship is destroyed
    this.destructionService.onEntityDestroyed((entity, _cause) => {
      if (entity instanceof Ship) {
        this.waveOrchestrator!.notifyShipDestroyed(entity);
      }
    });

    // Dialogue Manager
    this.coachMarkManager = CoachMarkManager.getInstance();
    this.missionDialogueManager = new MissionDialogueManager(
      this.inputManager, 
      this.canvasManager, 
      this.waveOrchestrator, 
      this.coachMarkManager
    );

    // Planet System
    this.planetSystem = new PlanetSystem(this.ship, this.inputManager, this.camera!, this.canvasManager, this.waveOrchestrator, this.unifiedSceneRenderer);
    this.planetSystem.registerPlanetsFromConfigs(missionLoader.getPlanetSpawnConfigs());

    // AsteroidSpawner
    this.asteroidSpawner = new AsteroidSpawningSystem(this.grid!, this.blockObjectRegistry, this.objectGrid!);

    // Overlay Displays (UI HUD)
    this.wavesOverlay = new WavesOverlay(this.canvasManager, this.waveOrchestrator);
    this.debugOverlay = new DebugOverlay(this.inputManager, this.canvasManager, this.shipRegistry, this.aiOrchestrator, this.objectGrid!);
    this.hud = new HudOverlay(this.canvasManager, this.floatingTextManager, this.blockDropDecisionMenu, this.inputManager);
    this.miniMap = new MiniMap(this.canvasManager, this.aiOrchestrator, this.planetSystem, getUniformScaleFactor());
    
    // Register player ship
    this.miniMap.setPlayerShip(this.ship);
    this.hud.setPlayerShip(this.ship);

    // Hide hide if in editor
    if (missionLoader.getMission().id === 'mission_editor') {
      this.hud.hide();
      this.miniMap.hide();
      this.wavesOverlay.hide();
    }

    // All systems that need to be updated every frame
    this.rebuildPlayerUpdatables();
    this.initializeFixedUpdatables();
    this.updatables = [...this.fixedUpdatables, ...this.dynamicUpdatables];

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
      this.popupMessageSystem!,
      this.missionDialogueManager,
      this.shipConstructionAnimator,
      this.planetSystem,
      this.aiOrchestrator,
      this.floatingTextManager,
      this.coachMarkManager,
      this.incidentOrchestrator,
      this.powerupSelectionMenu,
      this.tradePostMenu,
    ];

    this.isInitialized = true;
  }

  private rebuildPlayerUpdatables(): void {
    this.dynamicUpdatables = [];

    this.dynamicUpdatables.push(this.movement!);

    this.dynamicUpdatables.push({
      update: (dt: number) => {
        if (!this.ship) return;

        const intent: ShipIntent = this.playerController!.getIntent();
        this.movement!.setIntent(intent.movement);
        this.weaponSystem!.setIntent(intent.weapons);
        this.utilitySystem!.setIntent(intent.utility);

        try {
          this.weaponSystem!.update(dt, this.ship, this.ship.getTransform());
          this.utilitySystem!.update(dt, this.ship, this.ship.getTransform());
          this.ship.getAfterburnerComponent()?.update(dt);
        } catch (error) {
          console.error("Error updating system:", error);
        }
      }
    });
  }

  private initializeFixedUpdatables(): void {
    this.fixedUpdatables = [
      this.projectileSystem,
      this.laserSystem,
      this.particleManager,
      this.persistentParticleManager,
      this.aiOrchestrator,
      this.blockObjectUpdate!,
      this.destructionService,
      this.explosionSystem,
      ShieldEffectsSystem.getInstance(),
      this.screenEffects,
      this.pickupSystem,
      this.waveOrchestrator!,
      this.energyRechargeSystem!,
      this.popupMessageSystem!,
      this.shipConstructionAnimator,
      this.planetSystem!,
      this.lightingOrchestrator,
      this.incidentOrchestrator!
    ];
  }

  public async setShip(jsonData: string): Promise<void> {
    if (!this.grid || !this.camera) {
      throw new Error('EngineRuntime: grid or camera not initialized');
    }

    // === 1. Cleanup Existing Ship ===
    if (this.ship) {
      this.ship.destroyInstantly();
      this.destructionService.destroyEntity(this.ship, 'replaced'); // Instead of destroyInstantly
      this.shipRegistry.remove(this.ship);
      ShipGrid.getInstance().removeShip(this.ship);
      this.objectGrid?.remove(this.ship);
      this.aiOrchestrator.clearPlayerShip();
      MovementSystemRegistry.unregister(this.ship);
    }
    this.ship = null;
    this.collisionSystem.clearCache();

    // === 2. Load New Ship ===
    const { ship, controller, emitter, movement, weapons, utility } = await getStarterShipFromJson(
      jsonData,
      this.grid,
      this.shipRegistry,
      this.particleManager,
      this.projectileSystem,
      this.laserSystem,
      this.combatService,
      this.explosionSystem,
      this.collisionSystem,
      this.shipConstructionAnimator,
    );

    this.ship = ship;
    this.movement = movement;
    this.weaponSystem = weapons;
    this.utilitySystem = utility;

    // === 3. Rewire Systems ===
    this.playerController = new PlayerControllerSystem(this.camera, this.inputManager, this.cursorRenderer, this.ship);

    this.pickupSystem.setPlayerShip(this.ship);
    this.cursorRenderer.setPlayerShip(this.ship);
    this.shipBuilderController.setPlayerShip(this.ship);
    this.blockPlacementController.setPlayerShip(this.ship);
    this.blockDropDecisionMenu.setPlayerShip(this.ship);
    this.shipConstructionAnimator.setPlayerShip(this.ship);
    this.aiOrchestrator.registerPlayerShip(this.ship);
    MovementSystemRegistry.register(this.ship, this.movement);

    this.miniMap?.setPlayerShip(this.ship);
    this.hud?.setPlayerShip(this.ship);

    this.rebuildPlayerUpdatables();
    this.initializeFixedUpdatables();
    this.updatables = [...this.fixedUpdatables, ...this.dynamicUpdatables];

    // Close shipbuilder menu and resume if it's open
    if (this.shipBuilderMenu.isOpen()) {
      this.shipBuilderMenu.closeMenu();
      this.resume();
    }

    console.log(`[EngineRuntime] Ship successfully set from ${jsonData}`);
  }


  private registerLoopHandlers() {
    this.gameLoop.onUpdate(this.boundUpdate);
    this.gameLoop.onRender(this.boundRender);
  }

  private pause() {
    this.isPaused = true;
    this.waveOrchestrator!.pause();
  }

  private resume() {
    this.isPaused = false;
    this.waveOrchestrator!.resume();
  }

  private update = (dt: number) => {
    if (!this.isInitialized) return;
    if (this.isDestroyed) return;

    // Leveling up animation (Open menu after animation completes)
    if (this.levelingUpAnimationTimer > 0) {
      this.levelingUpAnimationTimer -= dt;

      if (this.levelingUpAnimationTimer <= 0) {
        this.levelingUpAnimationTimer = 0;
        this.pause();
        this.powerupSelectionMenu.openMenu();
      }
    }

    // Clear input consumed inputs
    this.inputManager.clearConsumedActions();

    // === Shader Special FX
    this.unifiedSceneRenderer!.update(dt);

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
      pauseMenu: this.pauseMenu!,
      settingsMenu: this.settingsMenu!,
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

    if (this.pauseMenu!.isOpen()) {
      this.pauseMenu!.update();
    }

    if (this.settingsMenu!.isOpen()) {
      this.settingsMenu!.update();
    }

    if (this.shipBuilderMenu.isOpen()) {
      this.shipBuilderMenu.update();
    }

    if (this.spaceStationBuilderMenu!.isOpen()) {
      this.spaceStationBuilderMenu!.update();
    }

    // Debug keys 
    if (this.inputManager.wasKeyJustPressed('Backquote')) {
      PlayerSettingsManager.getInstance().toggleDebugMode();
    }

    if (this.inputManager.wasKeyJustPressed('KeyJ')) {
      spawnShipBlueprint(0, 0, 'Vanguard');
      spawnShipBlueprint(0, 0, 'Monarch');
      spawnShipBlueprint(0, 0, 'Halo Mk I');
      spawnShipBlueprint(0, 0, 'Godhand Prototype');
    }

    if (this.inputManager.wasKeyJustPressed('KeyM')) {
      PlayerShipCollection.getInstance().addExperience('SW-1 Standard Issue', 100);
    }

    if (this.inputManager.wasKeyJustPressed('KeyT')) {
      this.tradePostMenu.openMenu('mission3-tradepost-0');
    }

    if (this.inputManager.wasKeyJustPressed('KeyP')) {
      testActivePowerupEffectResolver();
    }

    // TODO: Revisit this rendering pass, currently broken
    if (this.inputManager.wasKeyJustPressed('KeyB')) {
      spawnSpecialFx({
        worldX: 100,
        worldY: 0,
        radius: 600,
        strength: 2.0,
        duration: 1.2,
        type: 0, // e.g. shockwave
      });
    }

    if (this.inputManager.wasKeyJustPressed('Digit2')) {
      flags.unlockAllFlags();
    }

    if (this.inputManager.wasKeyJustPressed('KeyG')) {
      addPostProcessEffect('bloom');
      addPostProcessEffect('chromaticAberration');
    }

    if (this.inputManager.wasKeyJustPressed('Digit4')) {
      applyUnderwaterEffect(true);
    }

    if (this.inputManager.wasKeyJustPressed('Digit5')) {
      applyCoolCinematicEffect();
    }

    if (this.inputManager.wasKeyJustPressed('Digit8')) {
      this.ship?.rerasterize(this.canvasManager.getWebGL2Context('unifiedgl2'));
    }

    if (this.inputManager.wasKeyJustPressed('KeyH')) {
      clearPostProcessEffects();
    }

    if (this.inputManager.wasKeyJustPressed('Digit1')) {
      const randomTypes = ['engine1', 'engine2', 'engine3', 'engine4', 'hull1', 'hull2', 'hull3', 'fin1', 'fin2', 'facetplate1', 'facetplate2', 'turret1', 'turret2', 'turret3', 'turret4', 'laser1', 'harvester1', 'battery1', 'shield1', 'turret2', 'fuelTank1'];
      // const randomTypes = ['fuelTank1', 'fuelTank2', 'fuelTank3', 'fuelTank4'];
      // const randomTypes = ['haloBlade1', 'haloBlade2', 'haloBlade3', 'haloBlade4'];
      // const randomTypes = ['engine1', 'engine2', 'engine3', 'engine4'];
      // const randomTypes = ['engine4', 'hull4', 'fin4', 'facetplate4', 'turret4', 'laser1', 'battery2', 'shield2', 'harvester1', 'explosiveLance1', 'haloBlade3', 'haloBlade4'];
      // const randomTypes = ['heatSeeker1', 'heatSeeker2', 'heatSeeker3', 'heatSeeker4'];
      for (let i = 0; i < 5; i++) {
        this.blockDropDecisionMenu.enqueueBlock(getBlockType(randomTypes[Math.floor(Math.random() * randomTypes.length)])!);
      }
      // this.blockDropDecisionMenu.enqueueBlock(getBlockType(randomTypes[Math.floor(Math.random() * randomTypes.length)])!);
    }

    if (this.inputManager.wasKeyJustPressed('KeyN')) {
      if (this.waveOrchestrator!.getIsPaused()) {
        this.waveOrchestrator!.resume();
      } else {
        this.waveOrchestrator!.pause();
      }
    }

    if (this.inputManager.wasKeyJustPressed('Digit0')) {
      PlayerExperienceManager.getInstance().addEntropium(1000);
    }

    if (this.inputManager.wasKeyJustPressed('KeyO')) {
      PlayerTechnologyManager.getInstance().unlockAll();

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
      this.waveOrchestrator!.skipToNextWave();
    }

    if (this.inputManager.wasKeyJustPressed('KeyI')) {
      if (!this.spaceStationBuilderMenu!.isOpen()) {
        this.pause();
        console.log("Opening space station builder menu...");
        this.spaceStationBuilderMenu!.openMenu();
      } else {
        this.resume();
        console.log("Closing space station builder menu...");
        this.spaceStationBuilderMenu!.closeMenu();
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
      if (!this.shipBuilderMenu.isOpen()) {
        this.camera.follow(transform.position);
      }
      this.camera.update(dt);

      if (this.shipBuilderMenu.isOpen()) {
          this.shipBuilderController.update(transform);
      }
      if (this.spaceStationBuilderMenu!.isOpen()) {
        if (this.spaceStation) {
          this.spaceStationBuilderController!.update(this.spaceStation.getTransform());
        }
      }
    } catch (error) {
      console.error("Error getting ship transform:", error);
    }

    // Update input manager
    this.inputManager.updateFrame();
    this.hud!.update(dt); // BlockQueueDisplayManager is here

    // All updatables
    if (!this.isPaused) {
      this.updatables.forEach(system => system.update(dt)); // PlayerControllerSystem is here
    }

    // Always update these systems regardless of pause state
    this.tradePostMenu.update(dt);
    this.powerupSelectionMenu.update(dt);
    this.shipBuilderEffects.update(dt);
    this.missionDialogueManager!.update(dt);
    this.floatingTextManager.update(dt);
    this.coachMarkManager!.update(dt);
    this.persistentParticleManager.update(dt);
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
      const visibleBlockObjects = this.blockObjectCulling!.getVisibleObjects();
      const visibleShips = this.shipCulling!.getVisibleShips();
      const visibleLights = this.lightingOrchestrator.collectVisibleLights(this.camera);
      const activeParticles = this.particleManager.getActiveParticles();
      const persistentActiveParticles = this.persistentParticleManager.getActiveParticles();
      const spriteRequests = GlobalSpriteRequestBus.getAndClear();

      const visibleObjects = [...visibleBlockObjects, ...visibleShips, this.ship];
      const visibleParticles = [...activeParticles, ...persistentActiveParticles];

      if (this.ship) {
        this.ship.enqueueRenderRequest();
      }

      this.unifiedSceneRenderer!.render(
        this.camera,
        visibleObjects,
        visibleLights,
        spriteRequests,
        visibleParticles
      );
    }

    if (this.shipBuilderMenu.isOpen()) {
      this.shipBuilderController.render(this.canvasManager.getContext('entities'), transform);
      this.shipBuilderMenu.render(this.canvasManager.getContext('ui'));
    }

    if (this.blockDropDecisionMenu.isOpen()) {
      this.blockDropDecisionMenu.render(this.canvasManager.getContext('ui'));
      this.blockPlacementController.render(this.canvasManager.getContext('entities'), transform);
    }

    if (this.spaceStationBuilderMenu!.isOpen()) {
      if (this.spaceStation) {
        this.spaceStationBuilderController!.render(this.canvasManager.getContext('entities'), this.spaceStation.getTransform());
        this.spaceStationBuilderMenu!.render(this.canvasManager.getContext('ui'));
      }
    }

    if (this.pauseMenu!.isOpen()) {
      this.pauseMenu!.render(this.canvasManager.getContext('ui'));
    }

    if (this.settingsMenu!.isOpen()) {
      this.settingsMenu!.render(this.canvasManager.getContext('ui'));
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
    if (!this.isInitialized) {
      throw new Error('EngineRuntime: Cannot start before initialization');
    }

    this.ship?.rerasterize(this.canvasManager.getWebGL2Context('unifiedgl2'));

    this.gameLoop.start();
    this.asteroidSpawner!.spawnFieldById('asteroid-field-01');
    this.inputManager.disableAllActions();
    applyWarmCinematicEffect();
    setTimeout(() => {
      this.inputManager.enableAllActions();
      this.missionDialogueManager!.initialize();
    }, 4200);
  }

  public handlePlayerLevelUp() {
    console.log("Player leveled up!");
    this.inputManager.disableAction('pause');
    this.inputManager.disableAction('openShipBuilder');
    this.levelingUpAnimationTimer = 1.0;
    this.particleManager.emitBurst(this.ship!.getTransform().position, 100, {
      colors: ['#FFFF00', '#EFBF04', '#FFFFFF', '#C2B067'],
      randomDirection: true,
      speedRange: [800, 2000],
      sizeRange: [1.0, 2.0],
      lifeRange: [0.5, 1.0],
      fadeOut: true,
      light: true,
      lightRadiusScalar: 32,
      lightIntensity: 1.0,
    });
    audioManager.play('assets/sounds/sfx/debriefing/debriefing_addcores_00.wav', 'sfx', { maxSimultaneous: 10 });
    createLightFlash(this.ship!.getTransform().position.x, this.ship!.getTransform().position.y, 800, 1.0, 0.5, '#FFFF00');
    shakeCamera(10, 1, 10);
  }

  public handlePlayerVictory(timeoutMs: number = 5_000): void {
    console.log("Player victorious — debriefing will begin in 5 seconds...");
    setTimeout(() => {
      clearPostProcessEffects();
      addPostProcessEffect('sepia');
    }, timeoutMs - 100)

    setTimeout(() => {
      missionResultStore.finalize('victory', this.gameLoop.getElapsedSeconds());
      this.destroy();
      sceneManager.setScene('debriefing');
    }, timeoutMs);
  }

  public handlePlayerFailure(timeoutMs: number = 1000): void {
    if (missionLoader.getMission().id === 'mission_editor') {
      return;
    }
    setTimeout(() => {
      clearPostProcessEffects();
      addPostProcessEffect('sepia');
    }, timeoutMs - 100)

    setTimeout(() => {
      missionResultStore.finalize('defeat', this.gameLoop.getElapsedSeconds());
      this.destroy();
      sceneManager.setScene('debriefing');
    }, timeoutMs);
  }

  /**
  * Destroys the runtime and all associated systems.
  * Always called when returning to the Hub zone.
  **/
  public destroy(): void {
    console.log("EngineRuntime: Performing cleanup before scene transition.");
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.gameLoop.offUpdate(this.boundUpdate);
    this.gameLoop.offRender(this.boundRender);
    this.gameLoop.stop();

    // === Dispose of Eventbus Listeners ===
    GlobalEventBus.off('player:victory', this.boundHandleVictory);
    GlobalEventBus.off('player:defeat', this.boundHandleDefeat);
    GlobalEventBus.off('player:entropium:levelup', this.boundHandleLevelUp);
    GlobalEventBus.off('runtime:pause', this.boundPause);
    GlobalEventBus.off('runtime:resume', this.boundResume);

    // === Clean up singleton state ===
    this.waveOrchestrator!.destroy();
    this.shipRegistry.clear();
    this.aiOrchestrator.clear();
    ShieldEffectsSystem.getInstance().clear();
    PlayerResources.getInstance().postMissionClear();
    PlayerStats.getInstance().destroy();
    PlayerPowerupManager.destroy();
    ShipGrid.getInstance().destroy();
    MovementSystemRegistry.clear();
    BlockToObjectIndex.clear();
    Camera.destroy();
    MenuManager.getInstance().reset();
    CoachMarkManager.getInstance().clear();
    SpriteRendererGL.destroyInstance();

    // Additional cleanup
    this.pickupSystem.destroy();
    this.pickupSpawner.destroy();
    this.incidentOrchestrator!.destroy();
    this.destructionService.destroy();
    this.tradePostMenu.destroy();
    this.projectileSystem.destroy();

    // Optional: clear UI menus, overlays
    this.cursorRenderer.destroy();
    this.hud!.destroy();
    this.miniMap!.destroy();
    this.explosionSystem.destroy();
    this.particleManager.destroy();
    this.lightingOrchestrator.destroy();
    this.missionDialogueManager!.destroy();
    this.blockDropDecisionMenu.destroy();
    this.playerController!.destroy();

    // TODO : Destroy GL2 blocksprite cache?? Leaving undestroyed for use by Debriefing Scene
    destroyGLProjectileSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    destroyGLPickupSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    destroyGL2AsteroidBlockSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));

    // Cleanup Huds
    this.wavesOverlay!.destroy();
    this.hud!.destroy();
    this.miniMap!.destroy();
    PlayerExperienceManager.getInstance().destroy();

    // Clear rendering and update lists
    this.updatables.length = 0;
    this.renderables.length = 0;

    // Clear event listeners from global input systems
    this.inputManager.destroy();
    this.menuManager.reset();

    // Null references (defensive)
    this.ship = null;
    this.camera = null;
    this.grid = null;
    this.shipGrid = null;
    this.objectGrid = null;
    this.spaceStation = null;
    this.shipCulling = null;
    this.blockObjectCulling = null;
    this.blockObjectUpdate = null;
    this.waveOrchestrator = null;
    this.incidentOrchestrator = null;
    this.asteroidSpawner = null;
    this.unifiedSceneRenderer = null;
    this.missionDialogueManager = null;
    this.spaceStationBuilderMenu = null;

    console.log("EngineRuntime: Cleanup complete.");
  }
}
