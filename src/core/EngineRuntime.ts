// src/core/EngineRuntime.ts

import { Camera } from './Camera';
import { CanvasManager } from './CanvasManager';
import { updateInputFrame, consumeZoomDelta, isEscapePressed, isTabPressed } from './Input';

import { GameLoop } from './GameLoop';
import type { IUpdatable, IRenderable } from '@/core/interfaces/types';

import { MenuManager } from '@/ui/MenuManager';
import { ShipBuilderMenu } from '@/ui/menus/ShipBuilderMenu';
import { PauseMenu } from '@/ui/menus/PauseMenu';
import { HudOverlay } from '@/ui/overlays/HudOverlay';
import { WavesOverlay } from '@/ui/overlays/WavesOverlay';
import { MiniMap } from '@/ui/overlays/MiniMap';

import { BackgroundRenderer } from '@/rendering/BackgroundRenderer';
import { MultiShipRenderer } from '@/rendering/MultiShipRenderer';
import { UIRenderer } from '@/rendering/UIRenderer';

import { ProjectileSystem } from '@/systems/physics/ProjectileSystem';
import { PickupSystem } from '@/systems/pickups/PickupSystem';
import { ThrusterParticleSystem } from '@/systems/physics/ThrusterParticleSystem';
import { ThrusterEmitter } from '@/systems/physics/ThrusterEmitter';

import { PlayerControllerSystem } from '@/systems/controls/PlayerControllerSystem';
import { MovementSystem } from '@/systems/physics/MovementSystem';
import { WeaponSystem } from '@/systems/combat/WeaponSystem';
import { ShipBuilderController } from '@/systems/subsystems/ShipBuilderController';
import { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import { WaveSpawner } from '@/systems/wavespawner/WaveSpawner';

import { ShipRegistry } from '@/game/ship/ShipRegistry';
import { ShipCullingSystem } from '@/game/ship/systems/ShipCullingSystem';
import { getStarterShip } from '@/game/ship/utils/PrefabHelpers';
import { Grid } from '@/systems/physics/Grid';

import type { Ship } from '@/game/ship/Ship';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';

import { ExplosionSystem } from '@/systems/fx/ExplosionSystem';
import { ScreenEffectsSystem } from '@/systems/fx/ScreenEffectsSystem';

import { PlayerResources } from '@/game/player/PlayerResources';

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
  private pickupSystem: PickupSystem;
  private thrusterFx: ThrusterParticleSystem;
  private background: BackgroundRenderer;
  private multiShipRenderer: MultiShipRenderer;
  private uiRenderer: UIRenderer;
  private waveSpawner: WaveSpawner;
  private wavesOverlay: WavesOverlay;

  private movement: MovementSystem;
  private weaponSystem: WeaponSystem;
  private playerController: PlayerControllerSystem;
  private shipBuilderController: ShipBuilderController;
  private explosionSystem: ExplosionSystem;
  private screenEffects: ScreenEffectsSystem;

  private updatables: IUpdatable[] = [];
  private renderables: IRenderable[] = [];

  private escapeCooldown = 0;

  constructor() {
    this.canvasManager = new CanvasManager();
    this.gameLoop = new GameLoop();
    this.camera = new Camera(1280, 720);

    // Initialize player resources with starting currency
    const playerResources = PlayerResources.getInstance();
    playerResources.initialize(0); // Start with 0 currency

    this.grid = new Grid();  // Initialize global grid
    this.ship = getStarterShip(this.grid);  // Now the grid is initialized before passing to getStarterShip

    // Register player ship using the Singleton ShipRegistry
    this.shipRegistry.add(this.ship);
    this.shipCulling = new ShipCullingSystem(this.shipRegistry, this.camera);

    // Initialize ExplosionSystem and ScreenEffectsSystem
    this.explosionSystem = new ExplosionSystem(this.canvasManager, this.camera);
    this.screenEffects = new ScreenEffectsSystem(this.canvasManager);
    
    // Pass both systems to ProjectileSystem
    this.pickupSystem = new PickupSystem(this.canvasManager, this.camera, this.ship);
    this.projectileSystem = new ProjectileSystem(
      this.canvasManager, 
      this.camera, 
      this.grid,
      this.explosionSystem,
      this.screenEffects,
      this.pickupSystem
    );
    
    this.thrusterFx = new ThrusterParticleSystem(this.canvasManager, this.camera);
    const emitter = new ThrusterEmitter(this.thrusterFx);

    this.background = new BackgroundRenderer(this.canvasManager, this.camera);
    this.multiShipRenderer = new MultiShipRenderer(this.canvasManager, this.camera, this.shipCulling);
    this.uiRenderer = new UIRenderer(this.canvasManager, this.menuManager);

    this.movement = new MovementSystem(this.ship, emitter);
    this.weaponSystem = new WeaponSystem(this.projectileSystem);
    this.playerController = new PlayerControllerSystem(this.camera);
    this.shipBuilderController = new ShipBuilderController(this.ship, this.shipBuilderMenu, this.camera);

    // AI orchestration system
    this.aiOrchestrator = new AIOrchestratorSystem();

    this.hud = new HudOverlay(this.canvasManager, this.ship);
    this.miniMap = new MiniMap(this.canvasManager, this.ship, this.shipRegistry);

    // Create the enemy wave spawner
    this.waveSpawner = WaveSpawner.getInstance(
      this.shipRegistry,
      this.aiOrchestrator,
      this.ship,
      this.projectileSystem,
      this.thrusterFx,
      this.grid
    );
    this.wavesOverlay = new WavesOverlay(this.canvasManager, this.waveSpawner);

    this.updatables = [
      this.movement,
      this.projectileSystem,
      this.thrusterFx,
      this.aiOrchestrator,
      this.explosionSystem,
      this.screenEffects,
      this.pickupSystem,
      this.waveSpawner,
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
      this.projectileSystem,
      this.thrusterFx,
      this.multiShipRenderer,
      this.uiRenderer,
      this.hud,
      this.miniMap,
      this.explosionSystem,
      this.screenEffects,
      this.pickupSystem,
      this.wavesOverlay,
    ];

    this.registerLoopHandlers();
  }

  private registerLoopHandlers() {
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
  }

  private update = (dt: number) => {
    this.escapeCooldown = Math.max(0, this.escapeCooldown - dt);

    if (isTabPressed() && !this.menuManager.isMenuOpen()) {
      this.menuManager.open(this.shipBuilderMenu);
    }

    if (isEscapePressed() && this.escapeCooldown === 0) {
      if (!this.menuManager.isBlocking()) {
        this.menuManager.open(this.pauseMenu);
      } else {
        this.menuManager.close();
      }
      this.escapeCooldown = 0.3;
    }

    const transform = this.ship.getTransform();
    this.camera.adjustZoom(consumeZoomDelta());
    this.camera.follow(transform.position);

    if (!this.menuManager.isBlocking()) {
      this.updatables.forEach(system => system.update(dt));
    }

    if (this.menuManager.isMenuOpen() && this.shipBuilderMenu.isOpen()) {
      this.shipBuilderController.update(transform);
    }

    updateInputFrame();
  };

  private render = () => {
    const transform = this.ship.getTransform();

    this.canvasManager.clearLayer('entities');
    this.canvasManager.clearLayer('fx');

    this.renderables.forEach(system => system.render());

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
