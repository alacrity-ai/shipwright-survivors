// src/game/tradepost/TradePostMenu.ts

import { DEFAULT_CONFIG } from '@/config/ui';

import { CanvasManager } from '@/core/CanvasManager';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton } from '@/ui/primitives/UIButton';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { getUniformScaleFactor } from '@/config/view';
import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';

import { flags } from '@/game/player/PlayerFlagManager';

import { GlobalEventBus } from '@/core/EventBus';

import { pauseRuntime, resumeRuntime } from '@/core/interfaces/events/RuntimeReporter';
import { reportOverlayInteracting } from '@/core/interfaces/events/UIOverlayInteractingReporter';

import type { TradePostInstance } from './interfaces/TradePostInstance';
import { TradePostRegistry } from './registry/TradePostRegistry';
import { TradePostItemsList } from './TradePostItemsList';

import type { InputManager } from '@/core/InputManager';
import type { UIButton } from '@/ui/primitives/UIButton';

export class TradePostMenu {
  private inputManager: InputManager;
  private ctx: CanvasRenderingContext2D;
  private canvasManager: CanvasManager;

  private navManager: GamepadMenuInteractionManager;

  private tradePostInstance: TradePostInstance | null = null;
  private itemsList: TradePostItemsList | null = null;

  private open = false;

  private boundOpenMenu = (payload: { tradePostId: string }) => {
    this.openMenu(payload.tradePostId);
  };

  // === Layout Constants ===
  private windowX = 80;
  private windowY = 80;
  private windowYOffset = 50;
  private windowWidth = 560;
  private windowHeight = 360;

  private buttonWidth = 180;
  private buttonHeight = 40;

  private endTransmissionButton: UIButton;

  constructor(inputManager: InputManager) {
    this.inputManager = inputManager;
    this.navManager = new GamepadMenuInteractionManager(inputManager);
    this.canvasManager = CanvasManager.getInstance();
    this.ctx = this.canvasManager.getContext('ui');

    GlobalEventBus.on('tradepost:open', this.boundOpenMenu);

    this.endTransmissionButton = {
      x: 0, y: 0, width: this.buttonWidth, height: this.buttonHeight,
      label: 'End Transmission',
      isHovered: false,
      wasHovered: false,
      onClick: () => {
        this.closeMenu();
      },
      style: { textFont: `${13 * getUniformScaleFactor()}px monospace` },
      ...DEFAULT_CONFIG.button.style,
    };
  }

  resize(): void {
    const scale = getUniformScaleFactor();
    const viewportWidth = this.canvasManager.getCanvas('ui').width;
    const viewportHeight = this.canvasManager.getCanvas('ui').height;

    this.windowWidth = 600 * scale;
    this.windowHeight = 420 * scale;
    this.windowYOffset = 50 * scale;
    this.windowX = (viewportWidth / 2) - (this.windowWidth / 2);
    this.windowY = (viewportHeight / 2) - (this.windowHeight / 2) + this.windowYOffset;

    this.buttonWidth = 180 * scale;
    this.buttonHeight = 42 * scale;

    this.endTransmissionButton.width = this.buttonWidth;
    this.endTransmissionButton.height = this.buttonHeight;

    this.itemsList?.resize(this.windowX + (16 * scale), this.windowY + (32 * scale));
  }

  openMenu(tradePostId: string): void {
    pauseRuntime();

    this.tradePostInstance = TradePostRegistry.getInstanceById(tradePostId);
    this.itemsList = new TradePostItemsList(this.tradePostInstance, this.inputManager);
    this.open = true;

    this.resize();
    this.recomputeNavMap();
  }

  private recomputeNavMap(): void {
    this.navManager.clearNavMap();
    const navPoints = [];

    if (this.itemsList) {
      navPoints.push(...this.itemsList.getNavPoints());
    }

    const scale = getUniformScaleFactor();
    const buttonActualX = 640 * scale;
    const buttonActualY = 580 * scale;

    navPoints.push({
      gridX: 0,
      gridY: 3,
      screenX: buttonActualX,
      screenY: buttonActualY,
      isEnabled: true,
    });

    this.navManager.setNavMap(navPoints);
  }

  update(dt: number): void {
    if (!this.open) return;

    const mouse = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    this.navManager.update();

    const { x, y } = mouse ?? { x: -1, y: -1 };
    const btn = this.endTransmissionButton;
    const rect = { x: btn.x, y: btn.y, width: btn.width, height: btn.height };
    btn.isHovered = isMouseOverRect(x, y, rect, 1.0);

    if (btn.isHovered) {
      reportOverlayInteracting();
    }

    if (clicked && btn.isHovered) {
      btn.onClick();
    }

    if (this.itemsList) {
      this.itemsList.update(dt);
    }
  }

  render(): void {
    if (!this.open) return;

    const scale = getUniformScaleFactor();
    const ctx = this.ctx;

    // === Main CRT Window ===
    drawWindow({
      ctx,
      x: this.windowX,
      y: this.windowY,
      width: this.windowWidth,
      height: this.windowHeight,
      options: DEFAULT_CONFIG.window.options,
    });

    // === Title ===
    drawLabel(
      ctx,
      this.windowX + this.windowWidth / 2,
      this.windowY - (24 * scale),
      'Trade Terminal Online',
      {
        font: `${14 * scale}px monospace`,
        align: 'center',
        glow: true,
      },
    );

    // === Items List ===
    if (this.itemsList) {
      this.itemsList.render(ctx);
    }

    // === Footer Button ===
    this.endTransmissionButton.x = this.windowX + (this.windowWidth - this.buttonWidth) / 2;
    this.endTransmissionButton.y = this.windowY + this.windowHeight - this.buttonHeight - (16 * scale);

    drawButton(ctx, this.endTransmissionButton, 1.0, 13 * scale);
  }

  isOpen(): boolean {
    return this.open;
  }

  closeMenu(): void {
    resumeRuntime(); // Resume runtime after closing trade post menu
    flags.set('mission.intro-briefing.tradepost-closed'); // Set flag to indicate that the tradepost has been closed for tutorial
    this.open = false;
    this.navManager.clearNavMap();
  }

  destroy(): void {
    GlobalEventBus.off('tradepost:open', this.boundOpenMenu);
  }
}
