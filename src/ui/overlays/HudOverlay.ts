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

  private entropium: number = 0;
  private previousEntropium: number = 0;
  private experienceBar: PlayerExperienceBar;

  private bossHealthbarVisible: boolean = false;

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
  }

  destroy(): void {
    GlobalEventBus.off('meters:hide', this.onMetersHide);
    GlobalEventBus.off('meters:show', this.onMetersShow);
    GlobalEventBus.off('bosshealthbar:show', this.onBossHealthbarShow);
    GlobalEventBus.off('bosshealthbar:hide', this.onBossHealthbarHide);
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
