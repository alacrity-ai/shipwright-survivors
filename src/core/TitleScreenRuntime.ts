// src/core/TitleScreenRuntime.ts

import { Camera } from './Camera';
import { SmoothCameraPanner } from './components/SmoothCameraPanner';
import { getViewportWidth, getViewportHeight } from '@/config/view';
import { CanvasManager } from './CanvasManager';
import { InputManager } from './InputManager';
import { applyViewportResolution } from '@/shared/applyViewportResolution';
import { GlobalMenuReporter } from './GlobalMenuReporter';
import { BlockManager } from '@/game/blocks/system/BlockManager';
import { CollisionBoxManager } from '@/game/entities/collisionbox/CollisionBoxManager';
import { SpatialBodyManager } from '@/game/spatialbodies/SpatialBodyManager';

import type { IUpdatable, IRenderable } from '@/core/interfaces/types';

import { getStarterShip } from '@/game/ship/utils/PrefabHelpers';

import { missionLoader } from '@/game/missions/MissionLoader';
import { missionRegistry } from '@/game/missions/MissionRegistry';
import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import { initializeGL2BlockSpriteCache } from '@/rendering/cache/BlockSpriteCache';
import { initializeGLPickupSpriteCache, destroyGLPickupSpriteCache } from '@/rendering/cache/PickupSpriteCache';
import { initializeGLProjectileSpriteCache, destroyGLProjectileSpriteCache } from '@/rendering/cache/ProjectileSpriteCache';
import { initializeGL2AsteroidBlockSpriteCache, destroyGL2AsteroidBlockSpriteCache } from '@/rendering/cache/AsteroidSpriteCache';
import { GlobalSpriteRequestBus } from '@/rendering/unified/bus/SpriteRenderRequestBus';

import { BlockDropDecisionMenu } from '@/ui/menus/BlockDropDecisionMenu';
import { PopupMessageSystem } from '@/ui/PopupMessageSystem';

import { applyWarmCinematicEffect, applyCoolCinematicEffect } from '@/core/interfaces/events/PostProcessingEffectReporter';

import { getUniformScaleFactor } from '@/config/view';

import { UnifiedSceneRendererGL } from '@/rendering/unified/UnifiedSceneRendererGL';
import { ShipConstructionAnimatorService } from '@/game/ship/systems/ShipConstructionAnimatorService';
import { LightingOrchestrator } from '@/lighting/LightingOrchestrator';
import { SpriteRendererGL } from '@/rendering/gl/SpriteRendererGL';
import { FloatingTextManager } from '@/rendering/floatingtext/FloatingTextManager';

import { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import { PickupSystem } from '@/systems/pickups/PickupSystem';
import { ParticleManager } from '@/systems/fx/ParticleManager';
import { FireManager } from '@/systems/fx/FireManager';
import { ShockwaveManager } from '@/systems/fx/ShockwaveManager';
import { DamageTextManager } from '@/systems/damagetext/DamageTextManager';

import { missionResultStore } from '@/game/missions/MissionResultStore';
import { MissionDialogueManager } from '@/systems/dialogue/MissionDialogueManager';

import { BlockObjectCollisionSystem } from '@/systems/physics/BlockObjectCollisionSystem';
import { PlanetSystem } from '@/game/planets/PlanetSystem';
import { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import { CompositeBlockDestructionService } from '@/game/ship/CompositeBlockDestructionService';
import { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import { WaveOrchestratorFactory } from '@/game/waves/WaveOrchestratorFactory';
import { WaveOrchestrator } from '@/game/waves/orchestrator/WaveOrchestrator';
import { IncidentOrchestrator } from '@/systems/incidents/IncidentOrchestrator';
import { AsteroidSpawningSystem } from '@/game/spawners/AsteroidSpawningSystem';

import { CombatService } from '@/systems/combat/CombatService';
import { EnergyRechargeSystem } from '@/game/ship/systems/EnergyRechargeSystem';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { ShipCullingSystem } from '@/game/ship/systems/ShipCullingSystem';
import { ShipGrid } from '@/game/ship/ShipGrid';
import { CompositeBlockObjectGrid } from '@/game/entities/CompositeBlockObjectGrid';
import { BlockToObjectIndex } from '@/game/blocks/BlockToObjectIndexRegistry';
import { CompositeBlockObjectRegistry } from '@/game/entities/registries/CompositeBlockObjectRegistry';
import { CompositeBlockObjectCullingSystem } from '@/game/entities/systems/CompositeBlockObjectCullingSystem';
import { CompositeBlockObjectUpdateSystem } from '@/game/entities/systems/CompositeBlockObjectUpdateSystem';
import { Ship } from '@/game/ship/Ship';
import { Faction } from '@/game/interfaces/types/Faction';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { DestructionCause } from '@/game/ship/CompositeBlockDestructionService';

import { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import { ShieldEffectsSystem } from '@/systems/fx/ShieldEffectsSystem';
import { ShipBuilderEffectsSystem } from '@/systems/fx/ShipBuilderEffectsSystem';
import { ScreenEffectsSystem } from '@/systems/fx/ScreenEffectsSystem';


export class TitleScreenRuntime {
  // private readonly boundOnEntityDestroyed = (entity: CompositeBlockObject, cause: DestructionCause): void => {
  //   if (entity instanceof Ship && this.waveOrchestrator) {
  //     this.waveOrchestrator.notifyShipDestroyed(entity, cause);
  //   }
  // };

  private isInitialized = false;

  private blockManager: BlockManager;
  private collisionBoxManager: CollisionBoxManager;
  private spatialBodyManager: SpatialBodyManager;

  private inputManager: InputManager;
  private blockDropDecisionMenu: BlockDropDecisionMenu;

  private canvasManager: CanvasManager;
  private camera: Camera | null = null;
  private cameraPanner: SmoothCameraPanner | null = null;

  private mission: MissionDefinition
  private shipRegistry = ShipRegistry.getInstance();
  private blockObjectRegistry = CompositeBlockObjectRegistry.getInstance();
  private shipCulling: ShipCullingSystem | null = null;
  private blockObjectCulling: CompositeBlockObjectCullingSystem | null = null;
  private blockObjectUpdate: CompositeBlockObjectUpdateSystem | null = null;
  private aiOrchestrator: AIOrchestratorSystem;

  private shipGrid: ShipGrid | null = null;
  private objectGrid: CompositeBlockObjectGrid<CompositeBlockObject> | null = null;

  private ship: Ship | null = null;

  private combatService: CombatService;
  private destructionService: CompositeBlockDestructionService;
  private projectileSystem: ProjectileSystem;
  private pickupSystem: PickupSystem;
  private pickupSpawner: PickupSpawner;
  private particleManager: ParticleManager;
  private fireManager: FireManager;
  private shockwaveManager: ShockwaveManager;
  private damageTextManager: DamageTextManager;
  private persistentParticleManager: ParticleManager;
  private unifiedSceneRenderer: UnifiedSceneRendererGL | null = null;
  private floatingTextManager: FloatingTextManager;
  private shipConstructionAnimator: ShipConstructionAnimatorService;
  private waveOrchestrator: WaveOrchestrator | null = null;
  private incidentOrchestrator: IncidentOrchestrator | null = null;
  private asteroidSpawner: AsteroidSpawningSystem | null = null;
  private popupMessageSystem: PopupMessageSystem | null = null;
  private lightingOrchestrator: LightingOrchestrator;

  private collisionSystem: BlockObjectCollisionSystem;
  private planetSystem: PlanetSystem | null = null;
  private energyRechargeSystem: EnergyRechargeSystem | null = null;
  private explosionSystem: ExplosionSystem;
  private shipBuilderEffects: ShipBuilderEffectsSystem;
  private screenEffects: ScreenEffectsSystem;

  private updatables: IUpdatable[] = [];
  private fixedUpdatables: IUpdatable[] = [];
  private dynamicUpdatables: IUpdatable[] = [];
  private renderables: IRenderable[] = [];

  private isPaused = false;
  private isDestroyed = false;

  constructor() {
    this.canvasManager = CanvasManager.getInstance();
    this.inputManager = new InputManager(this.canvasManager.getCanvas('overlay'));
    this.blockManager = BlockManager.initialize();
    this.collisionBoxManager = CollisionBoxManager.initialize();

    this.camera = Camera.getInstance(getViewportWidth(), getViewportHeight());
    this.cameraPanner = new SmoothCameraPanner(this.camera);
    this.shipGrid = ShipGrid.getInstance();
    this.objectGrid = new CompositeBlockObjectGrid(3000);
    this.spatialBodyManager = SpatialBodyManager.initialize();

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
    // Fire manager
    this.fireManager = new FireManager(this.lightingOrchestrator);
    // Shockwave manager
    this.shockwaveManager = new ShockwaveManager();
    // Damage Text
    this.damageTextManager = DamageTextManager.getInstance();

    ShieldEffectsSystem.initialize(this.canvasManager, this.camera);

    // === Run the titlescreen mission
    missionLoader.setMission(missionRegistry.titlescreen);
    this.mission = missionLoader.getMission();

    // Initialize ExplosionSystem and ScreenEffectsSystem
    this.explosionSystem = new ExplosionSystem(this.canvasManager, this.camera, this.particleManager, this.lightingOrchestrator);
    this.screenEffects = new ScreenEffectsSystem(this.canvasManager);
    this.shipBuilderEffects = new ShipBuilderEffectsSystem(this.persistentParticleManager);

    // === Block Drop Decision Menu TODO : pickupSystem depends on this
    this.blockDropDecisionMenu = new BlockDropDecisionMenu(
      this.inputManager, 
      this.shipBuilderEffects,
      this.pause.bind(this), 
      this.resume.bind(this)
    );

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
    this.shipConstructionAnimator = new ShipConstructionAnimatorService(this.shipBuilderEffects);
  }

  public async initialize(): Promise<void> {
    // Register culling systems
    this.shipCulling = new ShipCullingSystem();
    this.blockObjectCulling = new CompositeBlockObjectCullingSystem(this.objectGrid!);

    // Energy Recharge System: Single instance used by all ships
    this.energyRechargeSystem = new EnergyRechargeSystem(this.shipRegistry);

    // Renderers
    this.unifiedSceneRenderer = new UnifiedSceneRendererGL(this.camera!, this.inputManager);
    this.unifiedSceneRenderer.setAmbientLight([0.4, 0.4, 0.4]);
    this.unifiedSceneRenderer.setBackgroundImage(this.mission.environmentSettings?.backgroundId ?? null);

    // Additional Update Systems
    this.blockObjectUpdate = new CompositeBlockObjectUpdateSystem(this.blockObjectRegistry);

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
    // this.destructionService.onEntityDestroyed(this.boundOnEntityDestroyed);

    const missionDialogue = new MissionDialogueManager(
      this.inputManager, 
      this.canvasManager, 
      this.waveOrchestrator, 
      null,
    );

    // Planet System
    this.planetSystem = new PlanetSystem(
      null, 
      this.inputManager, 
      this.camera!, 
      this.canvasManager, 
      this.waveOrchestrator, 
      this.unifiedSceneRenderer, 
      missionDialogue,
    );
    this.planetSystem.registerPlanetsFromConfigs(missionLoader.getPlanetSpawnConfigs());

    // AsteroidSpawner
    this.asteroidSpawner = new AsteroidSpawningSystem(this.blockObjectRegistry, this.objectGrid!);

    // All systems that need to be updated every frame
    this.initializeFixedUpdatables();
    this.updatables = [...this.fixedUpdatables, ...this.dynamicUpdatables];

    // All systems that need to be rendered every frame
    this.renderables = [
      this.explosionSystem,
      ShieldEffectsSystem.getInstance(),
      this.screenEffects,
      this.popupMessageSystem!,
      this.shipConstructionAnimator,
      this.planetSystem,
      this.aiOrchestrator,
      this.floatingTextManager,
      this.incidentOrchestrator,
    ];

    const { ship } = await getStarterShip(
      this.shipRegistry,
      this.particleManager,
      this.projectileSystem,
      this.combatService,
      this.explosionSystem,
      this.collisionSystem,
      this.shipConstructionAnimator,
      'player/ship_00',
      true
    );

    this.ship = ship;
    this.ship.turnOffAllBlockLights();
    this.ship.setFaction(Faction.Enemy);
    this.pickupSystem.setPlayerShip(this.ship);
    this.blockDropDecisionMenu.setPlayerShip(this.ship);
    this.shipConstructionAnimator.setPlayerShip(this.ship);
    this.aiOrchestrator.registerPlayerShip(this.ship);

    this.isInitialized = true;
  }

  private initializeFixedUpdatables(): void {
    this.fixedUpdatables = [
      this.projectileSystem,
      this.particleManager,
      this.fireManager,
      this.shockwaveManager,
      this.damageTextManager,
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
      this.incidentOrchestrator!,
    ];
  }

  private pause() {
    this.isPaused = true;
    this.waveOrchestrator!.pause();
  }

  private resume() {
    this.isPaused = false;
    this.waveOrchestrator!.resume();
  }

  public update = (dt: number) => {
    if (!this.isInitialized) return;
    if (this.isDestroyed) return;

    // Clear input consumed inputs
    this.inputManager.clearConsumedActions();

    // === Shader Special FX
    this.unifiedSceneRenderer!.update(dt);

    // === Camera ===
    try {
      if (!this.camera) {
        return;
      }
      this.cameraPanner!.update(dt);
      this.camera.adjustZoom(this.inputManager.consumeZoomDelta());
      this.camera.update(dt);
    } catch (error) {
      console.error("Error getting ship transform:", error);
    }

    // Update input manager
    this.inputManager.updateFrame();

    // All updatables
    if (!this.isPaused) {
      this.updatables.forEach(system => system.update(dt)); // PlayerControllerSystem is here
    }

    // Always update these systems regardless of pause state
    this.shipBuilderEffects.update(dt);
    this.floatingTextManager.update(dt);
    this.persistentParticleManager.update(dt);
  };

  public render = (dt: number) => {
    this.canvasManager.clearLayer('overlay');
    this.canvasManager.clearLayer('overlay');

    this.renderables.forEach(system => system.render(dt));

    // Render all graphics through Unified Rendering Pipeline
    if (this.camera) {
      const visibleLights = this.lightingOrchestrator.collectVisibleLights(this.camera);
      const visibleParticles1 = this.particleManager.getParticleSOA();
      const visibleParticles2 = this.persistentParticleManager.getParticleSOA();
      const visibleParticles = [visibleParticles1, visibleParticles2];
      const spriteRequests = GlobalSpriteRequestBus.getAndClear();
      const fireSOA = this.fireManager.getFireSOA();
      const shockwaveSOA = this.shockwaveManager.getSOA();
      const damageTextSOA = this.damageTextManager.getSOA();

      this.unifiedSceneRenderer!.render(
        dt,
        this.camera,
        visibleLights,
        spriteRequests,
        visibleParticles,
        [],
        fireSOA,
        shockwaveSOA,
        damageTextSOA
      );
    }
  };

  public async load(): Promise<void> {
    await Promise.all([]);
  }

  /**
   * Starts the title screen loop and initializes the "titlescreen" standin mission.
  **/
  public start(effect: 'cool' | 'warm' = 'cool') {
    if (!this.isInitialized) {
      throw new Error('TitleScreenRuntime: Cannot start before initialization');
    }

    missionResultStore.initialize();
    this.mission.onStart?.();

    this.asteroidSpawner!.spawnFieldById('asteroid-field-01');
    this.inputManager.disableAllActions();
  
    this.waveOrchestrator!.start(true);

    const x = -1877 * getUniformScaleFactor();
    const y = -244 * getUniformScaleFactor();
    this.camera!.setTarget(x, y);
    this.camera!.setToMinZoom();
    if (effect === 'cool') {
      applyCoolCinematicEffect();
    } else if (effect === 'warm') {
      applyWarmCinematicEffect();
    } else {
      throw new Error('Unknown effect: ' + effect);
    }
  }

  public moveCameraTo(x: number, y: number, speed: number = 100) {
    this.cameraPanner!.setSpeed(speed);
    this.cameraPanner!.panTo(x, y);
  }

  public rehomeCamera() {
    const x = -1877 * getUniformScaleFactor();
    const y = -244 * getUniformScaleFactor();
    this.camera!.setTarget(x, y);
    this.camera!.setToMinZoom();
  }

  /**
  * Destroys the runtime and all associated systems.
  * Must be called when ending the runtime to avoid leakage.
  **/
  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // === Clean up singleton state ===
    this.waveOrchestrator!.destroy();
    this.shipRegistry.clear();
    this.aiOrchestrator.clear();
    ShieldEffectsSystem.getInstance().clear();
    ShipGrid.getInstance().destroy();
    BlockToObjectIndex.clear();
    Camera.destroy();
    SpriteRendererGL.destroyInstance();
    GlobalMenuReporter.getInstance().destroy();
    DamageTextManager.getInstance().clear();
    this.blockManager.clear();
    this.collisionBoxManager.clear();
    this.spatialBodyManager.clear();

    // Additional cleanup
    this.pickupSystem.destroy();
    this.pickupSpawner.destroy();
    this.incidentOrchestrator!.destroy();
    this.destructionService.destroy();
    this.projectileSystem.destroy();
    this.blockDropDecisionMenu.destroy();
    this.waveOrchestrator!.destroy();
    this.combatService.destroy();
    this.planetSystem?.clear();

    // Optional: clear UI menus, overlays
    this.explosionSystem.destroy();
    this.particleManager.destroy();
    this.persistentParticleManager.destroy();
    this.fireManager.destroy();
    this.shockwaveManager.destroy();
    this.lightingOrchestrator.destroy();

    this.unifiedSceneRenderer!.destroy();

    // TODO : Destroy GL2 blocksprite cache?? Leaving undestroyed for use by Debriefing Scene
    destroyGLProjectileSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    destroyGLPickupSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    destroyGL2AsteroidBlockSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));

    // Clear rendering and update lists
    this.updatables.length = 0;
    this.renderables.length = 0;

    // Clear event listeners from global input systems
    this.inputManager.destroy();

    // Null references (defensive)
    this.camera = null;
    this.shipGrid = null;
    this.objectGrid = null;
    this.shipCulling = null;
    this.blockObjectCulling = null;
    this.blockObjectUpdate = null;
    this.waveOrchestrator = null;
    this.incidentOrchestrator = null;
    this.asteroidSpawner = null;
    this.unifiedSceneRenderer = null;
  }
}
