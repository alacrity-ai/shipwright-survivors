// src/core/EngineRuntime.ts

import { Camera } from './Camera';
import { CanvasManager } from './CanvasManager';
import { updateInputFrame, consumeZoomDelta, wasKeyJustPressed } from './Input';
import { GameLoop } from './GameLoop';
import type { IUpdatable, IRenderable } from '@/core/interfaces/types';

import { MenuManager } from '@/ui/MenuManager';
import { ShipBuilderMenu } from '@/ui/menus/ShipBuilderMenu';
import { PauseMenu } from '@/ui/menus/PauseMenu';
import { HudOverlay } from '@/ui/overlays/HudOverlay';
import { WavesOverlay } from '@/ui/overlays/WavesOverlay';
import { DebugOverlay } from '@/ui/overlays/DebugOverlay';
import { MiniMap } from '@/ui/overlays/MiniMap';

import { BackgroundRenderer } from '@/rendering/BackgroundRenderer';
import { MultiShipRenderer } from '@/rendering/MultiShipRenderer';
import { UIRenderer } from '@/rendering/UIRenderer';

import { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import { LaserSystem } from '@/systems/physics/LaserSystem';
import { PickupSystem } from '@/systems/pickups/PickupSystem';
import { ParticleManager } from '@/systems/fx/ParticleManager';
import { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';

import { PlayerControllerSystem } from '@/systems/controls/PlayerControllerSystem';
import { MovementSystem } from '@/systems/physics/MovementSystem';
import { WeaponSystem } from '@/systems/combat/WeaponSystem';
import { PickupSpawner } from '@/systems/pickups/PickupSpawner';
import { ShipBuilderController } from '@/systems/subsystems/ShipBuilderController';
import { ShipDestructionService } from '@/game/ship/ShipDestructionService';
import { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import { WaveSpawner } from '@/systems/wavespawner/WaveSpawner';
import { TurretBackend } from '@/systems/combat/backends/TurretBackend';
import { LaserBackend } from '@/systems/combat/backends/LaserBackend';
import { CombatService } from '@/systems/combat/CombatService';
import { EnergyRechargeSystem } from '@/game/ship/systems/EnergyRechargeSystem';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { ShipCullingSystem } from '@/game/ship/systems/ShipCullingSystem';
import { getStarterShip } from '@/game/ship/utils/PrefabHelpers';
import { Grid } from '@/systems/physics/Grid';

import type { Ship } from '@/game/ship/Ship';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import { RepairEffectSystem } from '@/systems/fx/RepairEffectSystem';
import { ScreenEffectsSystem } from '@/systems/fx/ScreenEffectsSystem';

import { PlayerResources } from '@/game/player/PlayerResources';
import { PlayerStats } from '@/game/player/PlayerStats';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';

export class EngineRuntime {
  private gameLoop: GameLoop;
  private menuManager = new MenuManager();
  private shipBuilderMenu = new ShipBuilderMenu();
  private pauseMenu = new PauseMenu(this.menuManager);
  private hud: HudOverlay;
  private miniMap: MiniMap;

  private canvasManager: CanvasManager;
  private camera: Camera;

  // Use Singleton instance for ShipRegistry
  private shipRegistry = ShipRegistry.getInstance();
  private shipCulling: ShipCullingSystem;
  private aiOrchestrator: AIOrchestratorSystem;

  private grid: Grid; // Global Grid instance
  private ship: Ship;  // Declare ship as a property

  private projectileSystem: ProjectileSystem;
  private laserSystem: LaserSystem;
  private pickupSystem: PickupSystem;
  private particleManager: ParticleManager;
  private background: BackgroundRenderer;
  private multiShipRenderer: MultiShipRenderer;
  private uiRenderer: UIRenderer;
  private waveSpawner: WaveSpawner;
  private wavesOverlay: WavesOverlay;
  private debugOverlay: DebugOverlay;

  private movement: MovementSystem;
  private weaponSystem: WeaponSystem;
  private energyRechargeSystem: EnergyRechargeSystem;
  private playerController: PlayerControllerSystem;
  private shipBuilderController: ShipBuilderController;
  private explosionSystem: ExplosionSystem;
  private repairEffectSystem: RepairEffectSystem;
  private screenEffects: ScreenEffectsSystem;

  private updatables: IUpdatable[] = [];
  private renderables: IRenderable[] = [];

  constructor() {
    this.canvasManager = new CanvasManager();
    this.gameLoop = new GameLoop();
    this.camera = new Camera(1280, 720);
    this.particleManager = new ParticleManager(this.canvasManager.getContext('particles'), this.camera);

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
    this.explosionSystem = new ExplosionSystem(this.canvasManager, this.camera);
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
      this.aiOrchestrator
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
    );

    // this.thrusterFx = new ThrusterParticleSystem(this.canvasManager, this.camera);
    this.background = new BackgroundRenderer(this.canvasManager, this.camera);
    this.multiShipRenderer = new MultiShipRenderer(this.canvasManager, this.camera, this.shipCulling);
    this.uiRenderer = new UIRenderer(this.canvasManager, this.menuManager);

    // Add components to player ship (Should all be abstracted into one factory)
    const emitter = new ThrusterEmitter(this.particleManager);
    this.movement = new MovementSystem(this.ship, emitter);
    this.weaponSystem = new WeaponSystem(
      new TurretBackend(this.projectileSystem),
      new LaserBackend(this.laserSystem)
    );

    this.energyRechargeSystem = new EnergyRechargeSystem(this.shipRegistry);
    this.playerController = new PlayerControllerSystem(this.camera);
    this.repairEffectSystem = new RepairEffectSystem(this.canvasManager, this.camera);
    this.shipBuilderController = new ShipBuilderController(this.ship, this.shipBuilderMenu, this.camera, this.repairEffectSystem);
    this.shipBuilderMenu.setRepairAllHandler(() => {
      this.shipBuilderController.repairAllBlocks();
    });

    this.hud = new HudOverlay(this.canvasManager, this.ship);
    this.miniMap = new MiniMap(this.canvasManager, this.ship, this.shipRegistry);

    // Create the enemy wave spawner
    this.waveSpawner = WaveSpawner.getInstance(
      this.shipRegistry,
      this.aiOrchestrator,
      this.ship,
      this.projectileSystem,
      this.laserSystem,
      this.particleManager,
      this.grid
    );
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
      this.screenEffects,
      this.pickupSystem,
      this.waveSpawner,
      this.energyRechargeSystem,
      {
        update: (dt: number) => {
          // Add defensive check to ensure ship still exists
          if (!this.ship || !this.ship.getTransform) {
            return;
          }
          
          const intent: ShipIntent = this.playerController.getIntent();
          this.movement.setIntent(intent.movement);
          this.weaponSystem.setIntent(intent.weapons);
          
          // Only update weapon system if ship is still valid
          try {
            this.weaponSystem.update(dt, this.ship, this.ship.getTransform());
          } catch (error) {
            console.error("Error updating weapon system:", error);
          }
        }
      },
      this.menuManager,
      this.background,
    ];

    this.renderables = [
      this.background,
      // this.projectileSystem,
      this.laserSystem,
      this.pickupSystem,
      this.particleManager,
      this.multiShipRenderer,
      this.uiRenderer,
      this.hud,
      this.miniMap,
      this.explosionSystem,
      this.screenEffects,
      this.wavesOverlay,
      this.debugOverlay
    ];

    this.registerLoopHandlers();
  }

  private registerLoopHandlers() {
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
  }

  private update = (dt: number) => {
    // Toggle the ship builder menu with Tab
    if (wasKeyJustPressed('Tab')) {
      if (this.menuManager.isMenuOpen()) {
        this.menuManager.close();
      } else {
        this.menuManager.open(this.shipBuilderMenu);
      }
    }

    if (wasKeyJustPressed('Escape')) {
      if (!this.menuManager.isBlocking()) {
        this.menuManager.open(this.pauseMenu);
      } else {
        this.menuManager.close();
      }
    }

    if (wasKeyJustPressed('Digit0')) {
      PlayerResources.getInstance().addCurrency(1000);
    }

    if (wasKeyJustPressed('KeyU')) {
      PlayerTechnologyManager.getInstance().unlockAll();
    }

    const transform = this.ship.getTransform();
    this.camera.adjustZoom(consumeZoomDelta());
    this.camera.follow(transform.position);

    // Always update the RepairEffectSystem
    this.repairEffectSystem.update(dt);

    if (!this.menuManager.isBlocking()) {
      this.updatables.forEach(system => system.update(dt));
    }

    if (this.menuManager.isMenuOpen() && this.shipBuilderMenu.isOpen()) {
      this.shipBuilderController.update(transform);
    }

    updateInputFrame();
  };

  private render = (dt: number) => {
    const transform = this.ship.getTransform();

    this.canvasManager.clearLayer('entities');
    this.canvasManager.clearLayer('fx');
    this.canvasManager.clearLayer('particles');

    this.renderables.forEach(system => system.render(dt));

    // Always render the repair effect system
    this.repairEffectSystem.render();

    if (this.menuManager.isMenuOpen() && this.shipBuilderMenu.isOpen()) {
      this.shipBuilderController.render(this.canvasManager.getContext('entities'), transform);
    }
  };

  public start() {
    this.gameLoop.start();
  }

  // Add this method to handle player ship destruction
  public handlePlayerDeath(): void {
    console.log("Player ship destroyed!");
    
    // Stop all systems that depend on the player ship
    this.ship.destroy();
  }
}
