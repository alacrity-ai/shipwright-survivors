// src/core/EngineRuntime.ts

import { Camera } from './Camera';
import { getViewportWidth, getViewportHeight, getUniformScaleFactor } from '@/config/view';
import { CanvasManager } from './CanvasManager';
import { InputManager } from './InputManager';
import { audioManager } from '@/audio/Audio';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import { CollisionBoxManager } from '@/game/entities/collisionbox/CollisionBoxManager';
import { CollisionBoxSystem } from '@/game/entities/collisionbox/CollisionBoxSystem';
import { SpatialBodyManager } from '@/game/spatialbodies/SpatialBodyManager';
import { GameLoop } from './GameLoop';
import { applyViewportResolution } from '@/shared/applyViewportResolution';
import { GlobalEventBus } from './EventBus';
import { GlobalMenuReporter } from './GlobalMenuReporter';
import { PlayerExperienceManager } from '@/game/player/PlayerExperienceManager';
import { PlayerTutorialManager } from '@/game/player/PlayerTutorialManager';
import { ArenaManager } from '@/game/arena/ArenaManager';
import { BossManager } from '@/game/boss/BossManager';
import { ShipFactory } from '@/game/ship/factories/ShipFactory';

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
import { JumpCastMenu } from '@/game/jumpcast/JumpCastMenu';
import { PlanetInteractionOptionsMenu } from '@/game/planets/PlanetInteractionOptionsMenu';
import { SpaceStationBuilderMenu } from '@/ui/menus/dev/SpaceStationBuilderMenu';
import { SpaceStationBuilderController } from '@/ui/menus/dev/SpaceStationBuilderController';
import { TradePostMenu } from '@/game/tradepost/TradePostMenu';
import { PlanetQuestsMenu } from '@/game/quests/ui/PlanetQuestsMenu';
import { QuestTrackerMenu } from '@/game/quests/ui/QuestTrackerMenu';
import { BlockDropDecisionMenu } from '@/ui/menus/BlockDropDecisionMenu';
import { BlockPlacementController } from '@/ui/components/BlockPlacementController';
import { SettingsMenu } from '@/ui/menus/SettingsMenu';
import { PauseMenu } from '@/ui/menus/PauseMenu';
import { HudOverlay } from '@/ui/overlays/HudOverlay';
import { WavesOverlay } from '@/ui/overlays/WavesOverlay';
import { PopupMessageSystem } from '@/ui/PopupMessageSystem';
import { TransientWordDisplay } from '@/ui/overlays/TransientWordDisplay';
import { DebugOverlay } from '@/ui/overlays/DebugOverlay';
import { MiniMap } from '@/ui/overlays/MiniMap';
import { emitHudHideAll, emitHudShowAll } from '@/core/interfaces/events/HudReporter';
import { ScreenEdgeIndicatorManager } from '@/ui/overlays/indicators/ScreenEdgeIndicatorManager';
import { CloudManager } from '@/game/veil/CloudManager';
import { generateCloudRegions } from '@/game/veil/CloudRegionGenerator';
import { VeilShipMutator } from '@/game/veil/VeilShipMutator';
import { VeilManager } from '@/game/veil/VeilManager';
import { 
  addPostProcessEffect, 
  clearPostProcessEffects, 
  applyWarmCinematicEffect, 
  applyCoolCinematicEffect, 
  applyUnderwaterEffect,
} from '@/core/interfaces/events/PostProcessingEffectReporter';

import { UnifiedSceneRendererGL } from '@/rendering/unified/UnifiedSceneRendererGL';
import { ShipConstructionAnimatorService } from '@/game/ship/systems/ShipConstructionAnimatorService';
import { JumpCastTransitionController } from '@/game/jumpcast/JumpCastTransitionController';
import { CursorRenderer } from '@/rendering/CursorRenderer';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { SpriteRendererGL } from '@/rendering/gl/SpriteRendererGL';
import { FloatingTextManager } from '@/rendering/floatingtext/FloatingTextManager';

import { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import { PickupSystem } from '@/systems/pickups/PickupSystem';
import { ParticleManager } from '@/systems/fx/ParticleManager';
import { LightningSystem } from '@/systems/fx/LightningSystem';
import { FireManager } from '@/systems/fx/FireManager';
import { ShockwaveManager } from '@/systems/fx/ShockwaveManager';
import { DamageTextManager } from '@/systems/damagetext/DamageTextManager';
import { DamageTextAggregator } from '@/systems/damagetext/DamageTextAggregator';

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
import { Ship } from '@/game/ship/Ship';
import { SpaceStation } from '@/game/entities/SpaceStation';

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';
import type { DestructionCause } from '@/game/ship/CompositeBlockDestructionService';

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
import { TradePostRegistry } from '@/game/tradepost/registry/TradePostRegistry';
import { PlayerTradePostManager } from '@/game/player/PlayerTradePostManager';
import { QuestCompletionController } from '@/game/quests/QuestCompletionController';
import { flags } from '@/game/player/PlayerFlagManager';
import { missionSettings } from '@/game/player/PlayerMissionManager';
import { resolveMissionWavesCached } from '@/game/waves/io/resolveMissionWaves';

// Debug
import { spawnBossArena } from './interfaces/events/BossReporter';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { spawnShipBlueprint } from './interfaces/events/PickupSpawnReporter';
import { eraseAllArtifacts } from '@/game/ship/artifacts/helpers/eraseAllArtifacts';
import { unlockAllArtifacts } from '@/game/ship/artifacts/helpers/unlockAllArtifacts';
import { spawnLaserBeam } from '@/systems/fx/helpers/boltSpawners';
import { reportQuestCompleted } from './interfaces/events/QuestReporter';
import { PlayerQuestManager } from '@/game/player/PlayerQuestManager';
import { exportUnifiedBlockAtlasAsPNG } from '@/rendering/cache/BlockSpriteCache';
import { reportDialogueLine, clearDialogueEvents } from './interfaces/events/DialogueReporter';
import { emitDefaultShockwave } from './interfaces/events/SpecialFxReporter';
import { openPowerupMenu } from './interfaces/events/MenuOpenReporter';
import { downloadBlockRegistryAsJson } from '@/game/blocks/BlockRegistry';

export class EngineRuntime {
  private gameLoop: GameLoop;
  private readonly boundUpdate = (dt: number) => this.update(dt);
  private readonly boundRender = (dt: number) => this.render(dt);
  private readonly boundOnEntityDestroyed = (entity: CompositeBlockObject, cause: DestructionCause): void => {
    if (entity instanceof Ship && this.waveOrchestrator) {
      this.waveOrchestrator.notifyShipDestroyed(entity, cause);
    }
  };

  private boundHandleVictory = () => this.handlePlayerVictory();
  private boundHandleDefeat = () => this.handlePlayerFailure();
  private boundHandleLevelUp = () => this.handlePlayerLevelUp();
  private boundPause = () => this.pause();
  private boundResume = () => this.resume();

  private isInitialized = false;

  private blockManager: BlockManager;
  private collisionBoxManager: CollisionBoxManager;
  private collisionBoxSystem: CollisionBoxSystem;

  private inputManager: InputManager;
  private missionDialogueManager: MissionDialogueManager | null = null;
  private coachMarkManager: CoachMarkManager | null = null;
  private menuManager = MenuManager.getInstance();
  private shipBuilderMenu: ShipBuilderMenu
  private powerupSelectionMenu: PowerupSelectionMenu;
  private questCompletionController: QuestCompletionController;
  private planetInteractionOptionsMenu: PlanetInteractionOptionsMenu;
  private tutorialManager: PlayerTutorialManager | null = null;
  private spatialBodyManager: SpatialBodyManager;
  private spaceStationBuilderMenu: SpaceStationBuilderMenu | null = null;
  private tradePostMenu: TradePostMenu;
  private planetQuestsMenu: PlanetQuestsMenu;
  private questTrackerMenu: QuestTrackerMenu;
  private jumpCastMenu: JumpCastMenu | null = null;
  private settingsMenu: SettingsMenu | null = null;
  private blockDropDecisionMenu: BlockDropDecisionMenu;
  private pauseMenu: PauseMenu | null = null;
  private hud: HudOverlay | null = null;
  private miniMap: MiniMap | null = null;
  private transientWordDisplay: TransientWordDisplay;
  private screenEdgeIndicatorManager: ScreenEdgeIndicatorManager;
  private arenaManager: ArenaManager;
  private bossManager: BossManager;

  private canvasManager: CanvasManager;
  private camera: Camera | null = null;

  private mission: MissionDefinition
  private shipRegistry = ShipRegistry.getInstance();
  private blockObjectRegistry = CompositeBlockObjectRegistry.getInstance();
  private shipCulling: ShipCullingSystem | null = null;
  private blockObjectCulling: CompositeBlockObjectCullingSystem | null = null;
  private blockObjectUpdate: CompositeBlockObjectUpdateSystem | null = null;
  private aiOrchestrator: AIOrchestratorSystem;

  private ship: Ship | null = null;
  private shipGrid: ShipGrid | null = null;
  private shipFactory: ShipFactory | null = null;
  private objectGrid: CompositeBlockObjectGrid<CompositeBlockObject> | null = null;
  private spaceStation: SpaceStation | null = null;

  private combatService: CombatService;
  private destructionService: CompositeBlockDestructionService;
  private projectileSystem: ProjectileSystem;
  private pickupSystem: PickupSystem;
  private pickupSpawner: PickupSpawner;
  private particleManager: ParticleManager;
  private persistentParticleManager: ParticleManager;
  private lightningSystem: LightningSystem;
  private fireManager: FireManager;
  private veilManager: VeilManager | null = null;
  private cloudManager: CloudManager | null = null;
  private veilShipMutator: VeilShipMutator | null = null;
  private shockwaveManager: ShockwaveManager;
  private damageTextManager: DamageTextManager;
  private damageTextAggregator: DamageTextAggregator;
  private unifiedSceneRenderer: UnifiedSceneRendererGL | null = null;
  private cursorRenderer: CursorRenderer;
  private floatingTextManager: FloatingTextManager;
  private shipConstructionAnimator: ShipConstructionAnimatorService;
  private jumpCastTransitionController: JumpCastTransitionController;
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
  private pendingLevelUps = 0;

  private isPaused = false;
  private isDestroyed = false;

  constructor() {
    this.canvasManager = CanvasManager.getInstance();
    this.inputManager = new InputManager(this.canvasManager.getCanvas('overlay'));
    this.gameLoop = new GameLoop();
    this.camera = Camera.getInstance(getViewportWidth(), getViewportHeight());
    this.shipGrid = ShipGrid.getInstance();
    this.objectGrid = new CompositeBlockObjectGrid(3000);
    this.blockManager = BlockManager.initialize();
    this.collisionBoxManager = CollisionBoxManager.initialize();
    this.collisionBoxSystem = new CollisionBoxSystem(32);
    this.spatialBodyManager = SpatialBodyManager.initialize();
    this.arenaManager = ArenaManager.initialize();

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
    this.particleManager = new ParticleManager(this.lightingOrchestrator, 'game');
    // Particle System which runs regardless of game pause
    this.persistentParticleManager = new ParticleManager(this.lightingOrchestrator, 'persistent');
    // Lightning System
    this.lightningSystem = new LightningSystem(this.lightingOrchestrator);
    // Fire System
    this.fireManager = new FireManager(this.lightingOrchestrator);
    // Shockwave System
    this.shockwaveManager = new ShockwaveManager();
    // Damage Text
    this.damageTextManager = DamageTextManager.getInstance();
    this.damageTextAggregator = DamageTextAggregator.getInstance();

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

    // === Screen edge indicator
    this.screenEdgeIndicatorManager = new ScreenEdgeIndicatorManager();

    // === Transient Word Display
    this.transientWordDisplay = new TransientWordDisplay('Mission 1', this.mission.name, 3.8, 'center');

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

    // === Announcement Popups
    this.questCompletionController = new QuestCompletionController();

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

    // JumpCast (Fast Travel)
    this.shipConstructionAnimator = new ShipConstructionAnimatorService(this.shipBuilderEffects);
    this.jumpCastTransitionController = new JumpCastTransitionController(
      this.inputManager,
      this.shipConstructionAnimator,
      this.particleManager,
    );

    // === Planet Menus
    this.tradePostMenu = new TradePostMenu(this.inputManager);
    this.planetQuestsMenu = new PlanetQuestsMenu(this.inputManager);
    this.questTrackerMenu = new QuestTrackerMenu(this.inputManager);
    this.planetInteractionOptionsMenu = new PlanetInteractionOptionsMenu(this.inputManager);

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
      this.combatService,
      this.particleManager,
    );

    this.shipFactory = new ShipFactory(
      this.shipRegistry,
      this.particleManager,
      this.projectileSystem,
      this.combatService,
      this.explosionSystem,
      this.collisionSystem,
      this.shipConstructionAnimator,
      this.aiOrchestrator
    );
    this.bossManager = BossManager.initialize(this.shipFactory, this.combatService);

    this.registerLoopHandlers();
  }

  public async initialize(): Promise<void> {
    // === Player Ship
    const activeShipFilepath = PlayerShipCollection.getInstance().getActiveShipFilepath();

    const { ship, controller, emitter, movement, weapons, utility } = await getStarterShip(
      this.shipRegistry,
      this.particleManager,
      this.projectileSystem,
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

    // Cloud Manager
    let generatedRegions;
    if (this.mission.autoGenerateCloudParams) {
      generatedRegions = generateCloudRegions(this.mission.autoGenerateCloudParams);
    }
    // this.cloudManager = new CloudManager(this.ship!, this.mission.cloudRegions ?? []);
    this.veilManager = new VeilManager(this.ship!, this.shipBuilderEffects, generatedRegions ?? [], this.shipFactory!);
    this.cloudManager = new CloudManager(this.ship!, this.mission.cloudRegions ?? [], 0);

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
    this.settingsMenu = new SettingsMenu(this.inputManager, this.menuManager, this.canvasManager);
    this.settingsMenu.lockResolution();
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
    this.spaceStation = getStarterSpaceStation();
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

    const waves = await resolveMissionWavesCached(this.mission);

    this.waveOrchestrator = WaveOrchestratorFactory.create(
      waves,
      this.shipRegistry,
      this.aiOrchestrator,
      this.particleManager,
      this.projectileSystem,
      this.combatService,
      this.explosionSystem,
      this.collisionSystem,
      this.shipConstructionAnimator,
      this.incidentOrchestrator,
      this.popupMessageSystem!
    );

    // Notify wave orchestrator when a ship is destroyed
    this.destructionService.onEntityDestroyed(this.boundOnEntityDestroyed);

    // Dialogue Manager
    this.coachMarkManager = CoachMarkManager.getInstance();
    this.missionDialogueManager = new MissionDialogueManager(
      this.inputManager, 
      this.canvasManager, 
      this.waveOrchestrator, 
      this.coachMarkManager
    );

    // Tutorial Manager
    this.tutorialManager = PlayerTutorialManager.getInstance(this.inputManager, this.coachMarkManager);

    // Planet System
    this.planetSystem = new PlanetSystem(
      this.ship, 
      this.inputManager, 
      this.camera!, 
      this.canvasManager, 
      this.waveOrchestrator, 
      this.unifiedSceneRenderer, 
      this.missionDialogueManager
    );
    this.planetSystem.registerPlanetsFromConfigs(missionLoader.getPlanetSpawnConfigs());
    this.jumpCastMenu = new JumpCastMenu(this.inputManager, this.planetSystem!, this.jumpCastTransitionController!);

    // Spawn spatial bodies
    this.spatialBodyManager.getSpatialBodyOrchestrator().populateFromConfig(
      this.mission.spatialBodies ?? [],
      this.mission.environmentSettings?.worldWidth ?? 0,
      this.mission.environmentSettings?.worldHeight ?? 0,
      missionLoader.getPlanetSpawnConfigs()
    );

    // AsteroidSpawner
    this.asteroidSpawner = new AsteroidSpawningSystem(this.blockObjectRegistry, this.objectGrid!);

    // Overlay Displays (UI HUD)
    this.wavesOverlay = new WavesOverlay(this.canvasManager, this.waveOrchestrator);
    this.hud = new HudOverlay(this.canvasManager, this.floatingTextManager, this.blockDropDecisionMenu, this.inputManager);
    this.debugOverlay = new DebugOverlay(
      this.inputManager, 
      this.canvasManager, 
      this.shipRegistry, 
      this.aiOrchestrator, 
      this.objectGrid!, 
      this.particleManager, 
      this.hud.getQueueDisplayManager(),
      this.veilManager
    );
    this.miniMap = new MiniMap(this.canvasManager, this.aiOrchestrator, this.planetSystem, this.veilManager, getUniformScaleFactor());
    
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
      this.hud,
      this.miniMap,
      this.screenEdgeIndicatorManager,
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
      this.questCompletionController,
      this.tradePostMenu,
      this.planetQuestsMenu,
      this.questTrackerMenu,
      this.planetInteractionOptionsMenu,
      this.jumpCastMenu,
      this.jumpCastTransitionController,
      this.transientWordDisplay
    ];

    this.canvasManager.setUnifiedRenderer(this.unifiedSceneRenderer!);

    this.isInitialized = true;
  }

  private rebuildPlayerUpdatables(): void {
    this.dynamicUpdatables = [];

    this.dynamicUpdatables.push(this.movement!);

    this.dynamicUpdatables.push({
      update: (dt: number) => {
        if (!this.ship) return;

        const intent: ShipIntent = this.playerController!.getIntent(dt);
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
      this.particleManager,
      this.lightningSystem,
      this.fireManager,
      this.shockwaveManager,
      this.damageTextAggregator,
      this.damageTextManager,
      this.aiOrchestrator,
      this.veilManager!,
      this.cloudManager!,
      this.blockObjectUpdate!,
      this.collisionBoxSystem,
      this.destructionService,
      this.explosionSystem,
      ShieldEffectsSystem.getInstance(),
      this.screenEffects,
      this.transientWordDisplay,
      this.pickupSystem,
      this.waveOrchestrator!,
      this.energyRechargeSystem!,
      this.popupMessageSystem!,
      this.shipConstructionAnimator,
      this.planetSystem!,
      this.lightingOrchestrator,
      this.incidentOrchestrator!,
      this.arenaManager,
      this.bossManager,
      this.tutorialManager!
    ];
  }

  public async setShip(jsonData: string): Promise<void> {
    if (!this.camera) {
      throw new Error('EngineRuntime: grid or camera not initialized');
    }

    // === 1. Cleanup Existing Ship ===
    if (this.ship) {
      this.ship.destroyInstantly();
      this.destructionService.destroyEntity(this.ship, 'replaced');
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
      this.shipRegistry,
      this.particleManager,
      this.projectileSystem,
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
        openPowerupMenu('experience');
        this.pendingLevelUps = 0;
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

    // === Fast Travel
    this.jumpCastTransitionController.update(dt);

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
    if (this.inputManager.wasKeyJustPressed('Slash')) {
      PlayerSettingsManager.getInstance().toggleDebugMode();
    }

    if (this.inputManager.wasKeyJustPressed('KeyJ')) {
      spawnShipBlueprint(0, 0, 'Vanguard');
      spawnShipBlueprint(0, 0, 'Monarch');
      spawnShipBlueprint(0, 0, 'Halo Mk I');
      spawnShipBlueprint(0, 0, 'Godhand Prototype');
    }

    if (this.inputManager.wasKeyJustPressed('KeyT')) {
      eraseAllArtifacts();
      TradePostRegistry.clearInstances();
    }

    if (this.inputManager.wasKeyJustPressed('KeyP')) {
      this.jumpCastTransitionController.initiateJump({ x: 20000, y: 20000 });
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

    // Dev-only lightning test (KeyL)
    if (this.inputManager.wasKeyJustPressed('KeyL')) {
      const angle  = Math.random() * Math.PI * 2;
      const length = 2000;
      const endX   = Math.cos(angle) * length;
      const endY   = Math.sin(angle) * length;

      const { x, y } = this.ship?.getTransform().position ?? { x: 0, y: 0 };

      spawnLaserBeam(x, y, endX, endY, [0.25, 0.9, 1.0, 1.0]);
    }

    if (this.inputManager.wasKeyJustPressed('Digit2')) {
      downloadBlockRegistryAsJson();
    }

    if (this.inputManager.wasKeyJustPressed('Digit3')) {
      openPowerupMenu('experience');
    }

    if (this.inputManager.wasKeyJustPressed('Digit4')) {
      openPowerupMenu('veil');
    }

    if (this.inputManager.wasKeyJustPressed('Digit5')) {
      PlayerQuestManager.getInstance().reset();
    }

    if (this.inputManager.wasKeyJustPressed('Digit6')) {
      reportQuestCompleted('incidents:cursedcargo1');
    }

    if (this.inputManager.wasKeyJustPressed('Digit7')) {
      reportQuestCompleted('ability:rollblocks');
    }

    if (this.inputManager.wasKeyJustPressed('Digit8')) {
      reportQuestCompleted('slayer:station_slayer1');
    }

    if (this.inputManager.wasKeyJustPressed('Digit9')) {
      exportUnifiedBlockAtlasAsPNG();
    }

    if (this.inputManager.wasKeyJustPressed('Digit1')) {
      // const randomTypes = ['engine1', 'engine2', 'engine3', 'engine4', 'hull1', 'hull2', 'hull3', 'fin1', 'fin2', 'facetplate1', 'facetplate2', 'turret1', 'turret2', 'turret3', 'turret4', 'laser1', 'harvester1', 'battery1', 'shield1', 'turret2', 'fuelTank1'];
      // const randomTypes = ['fuelTank1', 'fuelTank2', 'fuelTank3', 'fuelTank4'];
      const randomTypes = ['turret1', 'turret2', 'turret3', 'turret4', 'turret5'];
      // const randomTypes = ['engine1', 'engine2', 'engine3', 'engine4'];
      // const randomTypes = ['engine4', 'hull4', 'fin4', 'facetplate4', 'turret4', 'laser1', 'battery2', 'shield2', 'harvester1', 'explosiveLance1', 'haloBlade3', 'haloBlade4'];
      // const randomTypes = ['heatSeeker1', 'heatSeeker2', 'heatSeeker3', 'heatSeeker4', 'explosiveLance1', 'explosiveLance2'];
      // const randomTypes = ['heatSeeker1', 'heatSeeker2', 'heatSeeker3', 'heatSeeker4'];
      // const randomTypes = ['laser1', 'laser2', 'laser3', 'laser4'];
      // const randomTypes = ['heatSeeker1'];
      for (let i = 0; i < 5; i++) {
        this.blockDropDecisionMenu.enqueueBlock(getBlockType(randomTypes[Math.floor(Math.random() * randomTypes.length)])!);
      }
      // this.blockDropDecisionMenu.enqueueBlock(getBlockType(randomTypes[Math.floor(Math.random() * randomTypes.length)])!);
    }

    if (this.inputManager.wasKeyJustPressed('KeyN')) {
      reportDialogueLine('crazy-moe', 'Hello World! How are you!?');
    }

    if (this.inputManager.wasKeyJustPressed('KeyM')) {
      reportDialogueLine('crazy-moe', 'Goodbye world!');
    }

    if (this.inputManager.wasKeyJustPressed('Digit0')) {
      PlayerExperienceManager.getInstance().addEntropium(10000);
      missionResultStore.addEntropium(10000);
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
        this.spaceStationBuilderMenu!.openMenu();
      } else {
        this.resume();
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

    // Update input Manager and UI Menus/Overlays
    this.inputManager.updateFrame();
    this.hud!.update(dt); // BlockQueueDisplayManager is here
    this.tradePostMenu.update(dt);
    this.planetQuestsMenu.update(dt);
    this.questTrackerMenu.update();
    this.planetInteractionOptionsMenu.update(dt);
    this.jumpCastMenu!.update(dt);

    // All updatables
    if (!this.isPaused) {
      this.updatables.forEach(system => system.update(dt)); // PlayerControllerSystem is here
    }

    // Always update these systems regardless of pause state
    this.powerupSelectionMenu.update(dt);
    this.questCompletionController.update(dt);
    this.shipBuilderEffects.update(dt);
    this.missionDialogueManager!.update(dt);
    this.floatingTextManager.update(dt);
    this.coachMarkManager!.update(dt);
    this.persistentParticleManager.update(dt);
  };

  private render = (dt: number) => {
    if (!this.ship || this.isDestroyed) return;
    const transform = this.ship.getTransform();

    this.canvasManager.clearLayer('overlay');

    this.renderables.forEach(system => system.render(dt));

    // == Render all graphics through Unified Rendering Pipeline
    if (this.camera) {
      const visibleLights = this.lightingOrchestrator.collectVisibleLights(this.camera);
      const spriteRequests = GlobalSpriteRequestBus.getAndClear();
      const lightningSegments = this.lightningSystem.getSegments();
      const fireSOA = this.fireManager.getFireSOA();
      const damageTextSOA = this.damageTextManager.getSOA();
      const shockwaveSOA = this.shockwaveManager.getSOA();
      const particleSOA1 = this.particleManager.getParticleSOA();
      const particleSOA2 = this.persistentParticleManager.getParticleSOA();

      if (this.ship) {
        this.ship.enqueueRenderRequest();
      }

      this.unifiedSceneRenderer!.render(
        dt,
        this.camera,
        visibleLights,
        spriteRequests,
        [particleSOA1, particleSOA2],
        lightningSegments,
        fireSOA,
        shockwaveSOA,
        damageTextSOA
      );
    }

    if (this.shipBuilderMenu.isOpen()) {
      this.shipBuilderController.render(this.canvasManager.getContext('overlay'), transform);
      this.shipBuilderMenu.render(this.canvasManager.getContext('overlay'));
    }

    if (this.blockDropDecisionMenu.isOpen()) {
      this.blockDropDecisionMenu.render(this.canvasManager.getContext('overlay'));
      this.blockPlacementController.render(this.canvasManager.getContext('overlay'), transform);
    }

    if (this.spaceStationBuilderMenu!.isOpen()) {
      if (this.spaceStation) {
        this.spaceStationBuilderController!.render(this.canvasManager.getContext('overlay'), this.spaceStation.getTransform());
        this.spaceStationBuilderMenu!.render(this.canvasManager.getContext('overlay'));
      }
    }

    if (this.pauseMenu!.isOpen()) {
      this.pauseMenu!.render(this.canvasManager.getContext('overlay'));
    }

    if (this.settingsMenu!.isOpen()) {
      this.settingsMenu!.render(this.canvasManager.getContext('overlay'));
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

    this.mission.onStart?.();
    this.ship?.rerasterize(this.canvasManager.getWebGL2Context('unifiedgl2'));

    this.gameLoop.start();
    this.asteroidSpawner!.spawnFieldById('asteroid-field-01');
    this.inputManager.disableAllActions();
    emitHudHideAll();
    applyWarmCinematicEffect();

    setTimeout(() => {
      this.transientWordDisplay.start();
    }, 1000);

    // Unlock UI Elements and Input after intro
    setTimeout(() => {
      this.inputManager.enableAllActions();
      this.missionDialogueManager!.initialize();
      this.tutorialManager!.startIfNeeded();
      emitHudShowAll();
    }, 5000);
  }

  public handlePlayerLevelUp() {
    this.pendingLevelUps++;

    // Only disable actions + start timer if it's the *first* pending level-up
    if (this.pendingLevelUps === 1) {
      this.inputManager.disableAction('pause');
      this.inputManager.disableAction('openShipBuilder');
      this.levelingUpAnimationTimer = 1.0;
    }

    // Play animation and effects every time regardless
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

  public handlePlayerVictory(timeoutMs: number = 3_000): void {
    setTimeout(() => {
      clearPostProcessEffects();
      addPostProcessEffect('sepia');
    }, timeoutMs - 100)

    setTimeout(() => {
      missionResultStore.finalize('victory', this.gameLoop.getElapsedSeconds());
      PlayerTradePostManager.getInstance().reset();
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

  public getRenderer(): UnifiedSceneRendererGL {
    return this.unifiedSceneRenderer!;
  }

  /**
  * Destroys the runtime and all associated systems.
  * Always called when returning to the Hub zone.
  **/
  public destroy(): void {
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
    this.destructionService.offEntityDestroyed(this.boundOnEntityDestroyed);

    // === Clean up singleton state ===
    this.waveOrchestrator!.destroy();
    this.shipRegistry.clear();
    this.aiOrchestrator.clear();
    this.blockManager.clear();
    this.collisionBoxManager.clear();
    this.spatialBodyManager.clear();
    ShieldEffectsSystem.getInstance().clear();
    PlayerResources.getInstance().postMissionClear();
    PlayerStats.getInstance().destroy();
    PlayerPowerupManager.destroy();
    missionSettings.reset();
    ShipGrid.getInstance().destroy();
    MovementSystemRegistry.clear();
    BlockToObjectIndex.clear();
    Camera.destroy();
    MenuManager.getInstance().reset();
    CoachMarkManager.getInstance().clear();
    SpriteRendererGL.destroyInstance();
    GlobalMenuReporter.getInstance().destroy();
    PlayerQuestManager.getInstance().clearActiveQuests();
    DamageTextManager.getInstance().clear();
    DamageTextAggregator.getInstance().clear();
    this.arenaManager.destroy();
    this.bossManager.destroy();

    // Additional cleanup
    this.pickupSystem.destroy();
    this.pickupSpawner.destroy();
    this.incidentOrchestrator!.destroy();
    this.destructionService.destroy();
    this.tradePostMenu.destroy();
    this.planetQuestsMenu.destroy();
    this.questTrackerMenu.destroy();
    this.planetInteractionOptionsMenu.destroy();
    this.projectileSystem.destroy();
    this.screenEdgeIndicatorManager.destroy();
    this.jumpCastTransitionController.destroy();
    this.lightningSystem.destroy();
    this.questCompletionController.destroy();
    this.combatService.destroy();
    this.planetSystem?.clear();
    this.transientWordDisplay.destroy();
    this.powerupSelectionMenu.destroy();
    this.tutorialManager!.destroy();

    // Optional: clear UI menus, overlays
    this.cursorRenderer.destroy();
    this.hud!.destroy();
    this.miniMap!.destroy();
    this.explosionSystem.destroy();
    this.particleManager.destroy();
    this.persistentParticleManager.destroy();
    this.fireManager.destroy();
    this.shockwaveManager.destroy();
    this.lightingOrchestrator.destroy();
    this.missionDialogueManager!.destroy();
    this.blockDropDecisionMenu.destroy();
    this.playerController!.destroy();

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
    this.shipGrid = null;
    this.objectGrid = null;
    this.spaceStation = null;
    this.shipCulling = null;
    this.blockObjectCulling = null;
    this.blockObjectUpdate = null;
    this.waveOrchestrator = null;
    this.incidentOrchestrator = null;
    this.asteroidSpawner = null;
    this.missionDialogueManager = null;
    this.spaceStationBuilderMenu = null;
    this.unifiedSceneRenderer = null;
  }
}
