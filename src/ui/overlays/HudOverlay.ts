// src/ui/overlays/HudOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { Ship } from '@/game/ship/Ship';
import type { PlayerResources } from '@/game/player/PlayerResources';
import type { FloatingTextManager } from '@/rendering/floatingtext/FloatingTextManager';
import type { BlockDropDecisionMenu } from '@/ui/menus/BlockDropDecisionMenu';
import type { InputManager } from '@/core/InputManager';

import { PlayerExperienceBar } from '@/ui/overlays/components/PlayerExperienceBar';
import { PlayerExperienceManager } from '@/game/player/PlayerExperienceManager';

import { drawBossHealthbar } from '@/game/boss/helpers/drawHealthbar';
import { BossManager } from '@/game/boss/BossManager';

// import { drawUIResourceBar } from '@/ui/primitives/UIResourceBar';
// import { drawUIVerticalResourceBar } from '@/ui/primitives/UIVerticalResourceBar';
// import { drawFiringModeToggle } from '@/ui/primitives/UIFiringModeToggle'; // Deprecated, no longer in game
import { getUniformScaleFactor } from '@/config/view';

import { GlobalEventBus } from '@/core/EventBus';

import { PlayerResources as PlayerResourcesSingleton } from '@/game/player/PlayerResources';
import { BlockQueueDisplayManager } from '@/ui/overlays/components/BlockQueueDisplayManager';

export class HudOverlay {
  private ship: Ship | null = null;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly playerResources: PlayerResources;
  private readonly blockQueueDisplayManager: BlockQueueDisplayManager;

  private readonly onHide = () => this.hide();
  private readonly onShow = () => this.show();
  private readonly onMetersHide = () => this.hideMeters();
  private readonly onMetersShow = () => this.showMeters();
  // private readonly onFiringModeHide = () => this.hideFiringMode();
  // private readonly onFiringModeShow = () => this.showFiringMode();
  private readonly onBossHealthbarShow = () => this.showBossHealthbar();
  private readonly onBossHealthbarHide = () => this.hideBossHealthbar();
  private readonly onAttachAllButtonShow = () => this.blockQueueDisplayManager.showAttachAllButton();
  private readonly onAttachAllButtonHide = () => this.blockQueueDisplayManager.hideAttachAllButton();
  private readonly onRollButtonShow = () => this.blockQueueDisplayManager.showRollButton();
  private readonly onRollButtonHide = () => this.blockQueueDisplayManager.hideRollButton();
  private readonly onAttachButtonShow = () => this.blockQueueDisplayManager.showAttachButton();
  private readonly onAttachButtonHide = () => this.blockQueueDisplayManager.hideAttachButton();
  private readonly onCombineButtonShow = () => this.blockQueueDisplayManager.showCombineButton();
  private readonly onCombineButtonHide = () => this.blockQueueDisplayManager.hideCombineButton();
  private readonly onActiveContractsButtonShow = () => this.blockQueueDisplayManager.showActiveContractsButton();
  private readonly onActiveContractsButtonHide = () => this.blockQueueDisplayManager.hideActiveContractsButton();
  private readonly onJumpCastButtonShow = () => this.blockQueueDisplayManager.showJumpCastButton();
  private readonly onJumpCastButtonHide = () => this.blockQueueDisplayManager.hideJumpCastButton();

  private metersHidden: boolean = false;
  // private firingModeHidden: boolean = false;

  private entropium: number = 0;
  private previousEntropium: number = 0;
  private experienceBar: PlayerExperienceBar;

  private bossHealthbarVisible: boolean = false;

  // === Canvas Caches ===
  // Deprecated Meters
  // private fuelBarCacheCanvas: HTMLCanvasElement;
  // private fuelBarCacheCtx: CanvasRenderingContext2D;
  // private energyBarCacheCanvas: HTMLCanvasElement;
  // private energyBarCacheCtx: CanvasRenderingContext2D;
  // private speedBarCacheCanvas: HTMLCanvasElement;
  // private firingModeCacheCanvas: HTMLCanvasElement;
  // private firingModeCacheCtx: CanvasRenderingContext2D;
  // private speedBarCacheCtx: CanvasRenderingContext2D;

  // === Invalidation State ===
  // private lastFuel = -1;
  // private lastFuelMax = -1;
  // private lastEnergy = -1;
  // private lastEnergyMax = -1;
  // private lastSpeed = -1;
  // private lastFiringMode: any = null;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly floatingTextManager: FloatingTextManager,
    private readonly blockDropDecisionMenu: BlockDropDecisionMenu,
    private readonly inputManager: InputManager,
  ) {
    GlobalEventBus.on('hud:hide', this.onHide);
    GlobalEventBus.on('hud:show', this.onShow);
    GlobalEventBus.on('meters:hide', this.onMetersHide);
    GlobalEventBus.on('meters:show', this.onMetersShow);
    GlobalEventBus.on('bosshealthbar:show', this.onBossHealthbarShow);
    GlobalEventBus.on('bosshealthbar:hide', this.onBossHealthbarHide);
    // GlobalEventBus.on('firingmode:hide', this.onFiringModeHide);
    // GlobalEventBus.on('firingmode:show', this.onFiringModeShow);
    GlobalEventBus.on('attachAllButton:show', this.onAttachAllButtonShow);
    GlobalEventBus.on('attachAllButton:hide', this.onAttachAllButtonHide);
    GlobalEventBus.on('rollButton:show', this.onRollButtonShow);
    GlobalEventBus.on('rollButton:hide', this.onRollButtonHide);
    GlobalEventBus.on('attachButton:show', this.onAttachButtonShow);
    GlobalEventBus.on('attachButton:hide', this.onAttachButtonHide);
    GlobalEventBus.on('combineButton:show', this.onCombineButtonShow);
    GlobalEventBus.on('combineButton:hide', this.onCombineButtonHide);
    GlobalEventBus.on('activeContractsButton:show', this.onActiveContractsButtonShow);
    GlobalEventBus.on('activeContractsButton:hide', this.onActiveContractsButtonHide);
    GlobalEventBus.on('jumpCastButton:show', this.onJumpCastButtonShow);
    GlobalEventBus.on('jumpCastButton:hide', this.onJumpCastButtonHide);

    this.experienceBar = new PlayerExperienceBar(floatingTextManager);
    this.playerResources = PlayerResourcesSingleton.getInstance();
    this.entropium = PlayerExperienceManager.getInstance().getEntropium();
    this.previousEntropium = this.entropium;

    this.blockQueueDisplayManager = new BlockQueueDisplayManager(
      this.canvasManager,
      this.playerResources,
      this.blockDropDecisionMenu,
      this.inputManager
    );

    this.ctx = this.canvasManager.getContext('overlay');

    // const scale = getUniformScaleFactor();

    // this.fuelBarCacheCanvas = document.createElement('canvas');
    // this.fuelBarCacheCanvas.width = 160 * scale;
    // this.fuelBarCacheCanvas.height = 32 * scale;
    // this.fuelBarCacheCtx = this.fuelBarCacheCanvas.getContext('2d')!;

    // this.energyBarCacheCanvas = document.createElement('canvas');
    // this.energyBarCacheCanvas.width = 160 * scale;
    // this.energyBarCacheCanvas.height = 32 * scale;
    // this.energyBarCacheCtx = this.energyBarCacheCanvas.getContext('2d')!;

    // this.speedBarCacheCanvas = document.createElement('canvas');
    // this.speedBarCacheCanvas.width = 32 * scale;
    // this.speedBarCacheCanvas.height = 140 * scale;
    // this.speedBarCacheCtx = this.speedBarCacheCanvas.getContext('2d')!;

    // this.firingModeCacheCanvas = document.createElement('canvas');
    // this.firingModeCacheCanvas.width = 140 * scale;
    // this.firingModeCacheCanvas.height = 40 * scale;
    // this.firingModeCacheCtx = this.firingModeCacheCanvas.getContext('2d')!;
  }

  public setPlayerShip(ship: Ship): void {
    this.ship = ship;
  }

  update(dt: number): void {
    this.experienceBar.update(dt);
    this.blockQueueDisplayManager.update(dt);
  }

  render(dt: number): void {
    this.experienceBar.render();
    this.blockQueueDisplayManager.render();

    if (!this.ship) return;

    // Boss healthbar enabled in BossOrchestrator via event transmission
    if (this.bossHealthbarVisible) {
      const bossShip = BossManager.getInstance().getOrchestrator().getBossShip();
      if (bossShip) {
        drawBossHealthbar(this.ctx, bossShip);
      }
    }

    // const barWidth = Math.floor(140 * scale);
    // const barHeight = Math.floor(12 * scale);
    // const y = canvas.height - Math.floor(24 * scale);
    // const toggleX = Math.floor(64 * scale);

    if (!this.metersHidden) {
      // const velocity = this.ship.getTransform().velocity;
      // const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
      // const quantizedSpeed = Math.round(speed);

      // const energyComponent = this.ship.getEnergyComponent();
      // const energy = Math.floor(energyComponent?.getCurrent() ?? 0);
      // const maxEnergy = Math.floor(energyComponent?.getMax() ?? 0);

      // const afterburnerComponent = this.ship.getAfterburnerComponent();
      // const afterburnerValue = afterburnerComponent?.getCurrent() ?? 0;
      // const afterburnerMax = afterburnerComponent?.getMax() ?? 1;

      // // === Afterburner Fuel Bar ===
      // if (afterburnerValue !== this.lastFuel || afterburnerMax !== this.lastFuelMax) {
      //   this.lastFuel = afterburnerValue;
      //   this.lastFuelMax = afterburnerMax;

      //   this.fuelBarCacheCtx.clearRect(0, 0, this.fuelBarCacheCanvas.width, this.fuelBarCacheCanvas.height);

      //   drawUIResourceBar(this.fuelBarCacheCtx, {
      //     x: 10,
      //     y: 10,
      //     width: barWidth,
      //     height: barHeight,
      //     value: afterburnerValue / afterburnerMax,
      //     label: `${Math.floor(afterburnerValue)} / ${afterburnerMax}`,
      //     style: {
      //       barColor: '#ffcc00',
      //       borderColor: '#ffee88',
      //       backgroundColor: '#221800',
      //       glow: true,
      //       textColor: '#ffffaa',
      //       font: `${Math.floor(11 * scale)}px "Courier New", monospace`,
      //       scanlineIntensity: 0.3,
      //       chromaticAberration: true,
      //       phosphorDecay: true,
      //       cornerBevel: true,
      //       warningThreshold: 0.25,
      //       criticalThreshold: 0.1,
      //       warningColor: '#ffaa00',
      //       criticalColor: '#ff0040',
      //       animated: true,
      //     }
      //   }, dt);
      // }
      // ctx.drawImage(this.fuelBarCacheCanvas, 20 * scale, y - Math.floor(28 * scale));

      // // === Energy Bar ===
      // if (energy !== this.lastEnergy || maxEnergy !== this.lastEnergyMax) {
      //   this.lastEnergy = energy;
      //   this.lastEnergyMax = maxEnergy;

      //   this.energyBarCacheCtx.clearRect(0, 0, this.energyBarCacheCanvas.width, this.energyBarCacheCanvas.height);

      //   drawUIResourceBar(this.energyBarCacheCtx, {
      //     x: 10,
      //     y: 10,
      //     width: barWidth,
      //     height: barHeight,
      //     value: maxEnergy > 0 ? energy / maxEnergy : 1,
      //     label: `${Math.round(energy)} / ${maxEnergy}`,
      //     style: {
      //       barColor: '#0af',
      //       borderColor: '#6cf',
      //       backgroundColor: '#003',
      //       glow: true,
      //       textColor: '#9cf',
      //       font: `${Math.floor(11 * scale)}px "Courier New", monospace`,
      //       scanlineIntensity: 0.25,
      //       chromaticAberration: true,
      //       phosphorDecay: true,
      //       cornerBevel: true,
      //       warningThreshold: 0.25,
      //       criticalThreshold: 0.1,
      //       warningColor: '#ffaa00',
      //       criticalColor: '#ff0040',
      //       animated: true,
      //     }
      //   }, dt);
      // }
      // ctx.drawImage(this.energyBarCacheCanvas, 20 * scale, y - (8 * scale));

      // // === Speed Bar (Vertical) === // Deprecated
      // const speedBarHeight = Math.floor(120 * scale);
      // const speedBarWidth = Math.floor(12 * scale);
      // const speedBarX = Math.floor(18 * scale);
      // const speedBarY = y - speedBarHeight + Math.floor(14 * scale);

      // if (quantizedSpeed !== this.lastSpeed) {
      //   this.lastSpeed = quantizedSpeed;

      //   this.speedBarCacheCtx.clearRect(0, 0, this.speedBarCacheCanvas.width, this.speedBarCacheCanvas.height);

      //   drawUIVerticalResourceBar(this.speedBarCacheCtx, {
      //     x: 10,
      //     y: 10,
      //     width: speedBarWidth,
      //     height: speedBarHeight,
      //     value: quantizedSpeed,
      //     maxValue: 2000,
      //     style: {
      //       barColor: '#00ff41',
      //       backgroundColor: '#001100',
      //       borderColor: '#00aa33',
      //       glow: true,
      //       textColor: '#00ff88',
      //       showLabel: true,
      //       unit: 'm/s',
      //     }
      //   });
      // }
      // ctx.drawImage(this.speedBarCacheCanvas, speedBarX - 10, speedBarY - 10);
    };
  }

  destroy(): void {
    GlobalEventBus.off('meters:hide', this.onMetersHide);
    GlobalEventBus.off('meters:show', this.onMetersShow);
    GlobalEventBus.off('bosshealthbar:show', this.onBossHealthbarShow);
    GlobalEventBus.off('bosshealthbar:hide', this.onBossHealthbarHide);
    // GlobalEventBus.off('firingmode:hide', this.onFiringModeHide);
    // GlobalEventBus.off('firingmode:show', this.onFiringModeShow);
    GlobalEventBus.off('hud:hide', this.onHide);
    GlobalEventBus.off('hud:show', this.onShow);
    GlobalEventBus.off('attachAllButton:show', this.onAttachAllButtonShow);
    GlobalEventBus.off('attachAllButton:hide', this.onAttachAllButtonHide);
    GlobalEventBus.off('rollButton:show', this.onRollButtonShow);
    GlobalEventBus.off('rollButton:hide', this.onRollButtonHide);
    GlobalEventBus.off('attachButton:show', this.onAttachButtonShow);
    GlobalEventBus.off('attachButton:hide', this.onAttachButtonHide);
    GlobalEventBus.off('combineButton:show', this.onCombineButtonShow);
    GlobalEventBus.off('combineButton:hide', this.onCombineButtonHide);
    GlobalEventBus.off('activeContractsButton:show', this.onActiveContractsButtonShow);
    GlobalEventBus.off('activeContractsButton:hide', this.onActiveContractsButtonHide);
    GlobalEventBus.off('jumpCastButton:show', this.onJumpCastButtonShow);
    GlobalEventBus.off('jumpCastButton:hide', this.onJumpCastButtonHide);
    this.experienceBar.destroy();
    this.blockQueueDisplayManager.destroy();
  }

  private hideMeters(): void {
    this.metersHidden = true;
  }

  private showMeters(): void {
    this.metersHidden = false;
  }

  private showBossHealthbar(): void {
    this.bossHealthbarVisible = true;
  }

  private hideBossHealthbar(): void {
    this.bossHealthbarVisible = false;
  }

  // private hideFiringMode(): void {
  //   this.firingModeHidden = true;
  // }

  // private showFiringMode(): void {
  //   this.firingModeHidden = false;
  // }

  public hide(): void {
    this.metersHidden = true;
    // this.firingModeHidden = true;
  }

  public show(): void {
    this.metersHidden = false;
    // this.firingModeHidden = false;
  }

  public getQueueDisplayManager(): BlockQueueDisplayManager {
    return this.blockQueueDisplayManager;
  }
}
