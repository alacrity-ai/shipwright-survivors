// src/game/jumpcast/JumpCastProgressPopup.ts
/*  ⭑  In-Transit Display for JumpCast Network  ⭑  */

import { DEFAULT_CONFIG } from '@/config/ui';

import { CanvasManager } from '@/core/CanvasManager';
import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { drawMinimalistProgressBar } from '@/ui/primitives/UIMinimalistProgressBar';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { getUniformScaleFactor } from '@/config/view';

import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';
import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';

import type { InputManager } from '@/core/InputManager';

const DEFAULT_WARP_DURATION_MS = 3000;          // 3.5 s placeholder
const INTERACTABLE_LOCK_MS = 2500;

export class JumpCastProgressPopup {
  // ──────────────────────────────────── dependencies ────────────────────────────────────
  private readonly input: InputManager;
  private readonly nav : GamepadMenuInteractionManager;
  private readonly cvs : CanvasManager;
  private readonly ctx : CanvasRenderingContext2D;

  // ────────────────────────────────────── state ─────────────────────────────────────────
  private open           = false;
  private remainingMs    = DEFAULT_WARP_DURATION_MS;

  private completed = false;
  private canceled = false;

  // ───────────────────────────────────── layout ─────────────────────────────────────────
  private windowW = 420;
  private windowH = 160;
  private windowX = 0;
  private windowY = 0;

  private progressBarH = 0;

  private readonly cancelBtn: UIButton;

  constructor(inputManager: InputManager) {
    this.input = inputManager;
    this.cvs   = CanvasManager.getInstance();
    this.ctx   = this.cvs.getContext('overlay');
    this.nav   = new GamepadMenuInteractionManager(this.input);

    this.progressBarH = 24 * getUniformScaleFactor();

    // Cancel button definition
    this.cancelBtn = {
      x: 0, y: 0, width: 160, height: 44,
      label: 'Abort Jump',
      isHovered : false,
      wasHovered: false,
      onClick   : () => this.closeMenu(),
      style     : { textFont: `${13 * getUniformScaleFactor()}px monospace` },
      ...DEFAULT_CONFIG.button.style,
    };
  }

  // ────────────────────────────────── public contract ───────────────────────────────────
  openMenu(durationMs: number = DEFAULT_WARP_DURATION_MS): void {
    this.remainingMs = durationMs;
    this.open        = true;
    this.resize();
    this.recomputeNavMap();

    this.completed = false;
    this.canceled = false;

    GlobalMenuReporter.getInstance().setMenuOpen('jumpCastProgress');
  }

  isOpen(): boolean {
    return this.open;
  }

  closeMenu(): void {
    if (!this.open) return;

    if (!this.completed) {
      this.canceled = true;
    }

    this.open = false;
    this.nav.clearNavMap();

    GlobalMenuReporter.getInstance().setMenuClosed('jumpCastProgress');
  }

  // ───────────────────────────────── frame lifecycle ────────────────────────────────────
  update(dt: number): void {
    if (!this.open) return;

    // countdown
    this.remainingMs -= dt * 1000;
    if (this.remainingMs <= 0) {
      this.completed = true;
      this.closeMenu();
      return;
    }

    // input handling
    if (this.remainingMs <= INTERACTABLE_LOCK_MS) {
      const mouse   = this.input.getMousePosition();
      const clicked = this.input.wasMouseClicked();
      this.nav.update();

      const { x, y } = mouse ?? { x: -1, y: -1 };
      const rect     = { x: this.cancelBtn.x, y: this.cancelBtn.y, width: this.cancelBtn.width, height: this.cancelBtn.height };

      this.cancelBtn.isHovered = isMouseOverRect(x, y, rect, 1.0);
      if (clicked && this.cancelBtn.isHovered) this.cancelBtn.onClick();

      // gamepad/Escape quick-abort
      if (this.input.wasActionJustPressed('cancel') || this.input.wasKeyJustPressed('Escape'))
        this.closeMenu();
    }
  }

  render(): void {
    if (!this.open) return;
    const scale = getUniformScaleFactor();
    const ctx   = this.ctx;

    // Title (Planet-specific if desired)
    drawLabel(
      ctx,
      this.windowX + this.windowW / 2,
      this.windowY - 24 * scale,
      'Jump Initiating ...',
      {
        font : `${14 * scale}px monospace`,
        align: 'center',
        glow : true,
      },
    );

    // popup body
    drawMinimalistWindow(
      ctx,
      this.windowX,
      this.windowY,
      this.windowW,
      this.windowH,
      { ...DEFAULT_CONFIG.window.options, alpha: 0.7 },
    );

    // ─── Progress bar replaces headline ────────────────────────────────
    const progress = 1 - (this.remainingMs / DEFAULT_WARP_DURATION_MS);
    const barW = this.windowW - 48 * scale;
    const barH = this.progressBarH;
    const barX = this.windowX + (this.windowW - barW) / 2;
    const barY = this.windowY + 32 * scale;

    drawMinimalistProgressBar(ctx, barX, barY, barW, barH, progress, {
      alpha: 0.9,
    });

    // cancel control
    drawButton(ctx, this.cancelBtn, 1.0, 13 * scale);
  }

  // ──────────────────────────────────── helpers ─────────────────────────────────────────
  private resize(): void {
    const scale   = getUniformScaleFactor();
    const vpW     = this.cvs.getCanvas('ui').width;
    const vpH     = this.cvs.getCanvas('ui').height;

    this.windowW  = 380 * scale;
    this.windowH  = 140 * scale;
    this.windowX  = (vpW - this.windowW) / 2;
    this.windowY  = (vpH - this.windowH) / 2 + (140 * scale);

    // center cancel button beneath text
    this.cancelBtn.width  = 160 * scale;
    this.cancelBtn.height = 46 * scale;
    this.cancelBtn.x      = this.windowX + (this.windowW - this.cancelBtn.width) / 2;
    this.cancelBtn.y      = this.windowY + this.windowH - this.cancelBtn.height - 24 * scale;
  }

  private recomputeNavMap(): void {
    this.nav.clearNavMap();
    this.nav.setNavMap([
      {
        gridX   : 0, gridY: 0,
        screenX : this.cancelBtn.x + this.cancelBtn.width / 2,
        screenY : this.cancelBtn.y + this.cancelBtn.height / 2,
        isEnabled: true,
      },
    ]);
  }

  /** Returns true only if the jump completed via timer (not canceled manually). */
  public timerComplete(): boolean {
    return this.completed;
  }

  public wasCanceled(): boolean {
    return this.canceled;
  }
}
