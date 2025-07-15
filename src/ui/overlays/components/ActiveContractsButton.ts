// ─────────────────────────────────────────────────────────────────────────────
// src/ui/overlays/components/ActiveContractsButton.ts
//
// “Active Contracts” – opens the contract/quest tracker overlay.
// Mirrors JumpCast / Place / Combine buttons; business logic stubbed.
// ─────────────────────────────────────────────────────────────────────────────

import { getUniformScaleFactor }    from '@/config/view';
import { drawMinimalistButton }     from '@/ui/primitives/UIMinimalistButton';
import { ButtonPulseController }    from '@/ui/primitives/controllers/ButtonPulseController';
import { setCursor, restoreCursor } from '@/core/interfaces/events/CursorReporter';
import { getActiveContractsIcon }   from '@/ui/overlays/components/icons/activeContractsButton';
import { GlobalMenuReporter }       from '@/core/GlobalMenuReporter';
import { audioManager }             from '@/audio/Audio';

import type { InputAction }         from '@/core/input/interfaces/InputActions';
import { GamepadButtonAlias }       from '@/core/input/interfaces/GamePadButtonAlias';
import { InputDeviceTracker }       from '@/core/input/InputDeviceTracker';

import { UIButtonTooltipRenderer }  from '@/ui/overlays/components/ButtonTooltip';

export class ActiveContractsButton {
  /* ──────────────────────────── state ──────────────────────────── */
  private isHovered = false;

  private readonly width  = 44;
  private readonly height = 44;

  private x = 0;
  private y = 0;
  private scale = 1;

  private locked = false;

  private readonly tooltip         = new UIButtonTooltipRenderer();
  private readonly pulseController = new ButtonPulseController(0.4, 3.0);

  private readonly globalMenu = GlobalMenuReporter.getInstance();

  private hoverSoundPlayed = false;

  /* ───────────────────────── ctor / resize ─────────────────────── */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly inputManager: {
      getMousePosition: () => { x: number; y: number };
      wasMouseClicked: (phys: boolean) => boolean;
      wasActionJustPressed: (alias: InputAction) => boolean;
      wasGamepadAliasJustPressed: (alias: GamepadButtonAlias) => boolean;
    }
  ) { this.resize(); }

  public resize(): void {
    this.scale = getUniformScaleFactor();
    this.y     = this.canvas.height - Math.floor(54 * this.scale);
    // Place at left‑most edge of the HUD button strip (adjust as needed).
    this.x     = Math.floor(this.canvas.width / 2) + Math.floor(308 * this.scale);
  }
  private getPosition() { return { x: this.x, y: this.y }; }

  /* ───────────────────────── update loop ───────────────────────── */
  public update(dt: number): void {
    if (this.globalMenu.isMenuOpen('blockDropDecisionMenu')) return;

    this.pulseController.update(dt);

    /* hover detection */
    const mouse = this.inputManager.getMousePosition();
    const { x, y } = this.getPosition();
    const sw = this.width  * this.scale;
    const sh = this.height * this.scale;

    this.isHovered =
      mouse.x >= x && mouse.x <= x + sw &&
      mouse.y >= y && mouse.y <= y + sh;

    /* hover FX */
    if (this.isHovered) {
      setCursor('hovered');
      if (!this.hoverSoundPlayed) {
        audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 8 });
        this.hoverSoundPlayed = true;
      }
      this.globalMenu.setOverlayHovered('activeContractsButton');
    } else {
      this.hoverSoundPlayed = false;
      this.globalMenu.setOverlayNotHovered('activeContractsButton');
      restoreCursor();
    }

    /* activation */
    const clickedMouse = this.isHovered && this.inputManager.wasMouseClicked(true);
    const clickedPad   = this.inputManager.wasActionJustPressed('activeContractsButton');

    if (!this.locked && (clickedMouse || clickedPad)) {
      if (this.globalMenu.isAnyMenuOpen()) return;
      this.activate();
    }
  }

  /* ───────────────────────── render ────────────────────────────── */
  public render(ctx: CanvasRenderingContext2D): void {
    if (this.globalMenu.isMenuOpen('blockDropDecisionMenu')) return;

    const { x, y } = this.getPosition();
    const finalAlpha = this.pulseController.getPulseAlphaMultiplier();

    drawMinimalistButton(ctx, {
      x, y,
      width : this.width,
      height: this.height,
      iconCanvas: getActiveContractsIcon(),
      label: '',
      isHovered: this.isHovered,
      onClick: () => {},                 // handled in update()
      style: {
        borderRadius  : 5 * this.scale,
        fillColor     : '#001122',
        borderColor   : '#FFD700',  // gold
        textColor     : '#FFD700',
        highlightColor: '#FFD700',
        alpha         : finalAlpha,
        fontSize      : 24,
      }
    }, this.scale);

    /* tooltip */
    if (this.isHovered) {
      const sw = this.width * this.scale;
      const hotkey = InputDeviceTracker.getInstance().gamepadLastUsed() ? '(B)' : '(C)';
      this.tooltip.render(hotkey, x, y, sw, this.scale);
    }
  }

  /* ──────────────────────── internals ─────────────────────────── */
  /**
   * Opens the Active Contracts overlay.
   * Business wiring deferred.
   */
  private activate(): void {
    // TODO: Dispatch open‑contracts overlay event / state change.
    audioManager.play('assets/sounds/sfx/ui/click_00.wav', 'sfx', { maxSimultaneous: 8 });
    this.pulseController.trigger(0.25, 1);
  }

  /* external lock helpers */
  public lock()   { this.locked = true;  }
  public unlock() { this.locked = false; }

  public getIsHovered() { return this.isHovered; }
}
