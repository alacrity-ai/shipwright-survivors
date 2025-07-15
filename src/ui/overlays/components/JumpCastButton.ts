// ─────────────────────────────────────────────────────────────────────────────
// src/ui/overlays/components/JumpCastButton.ts
//
// “Jump Cast” – initiates the fast‑travel (hex‑gate) sequence.
// Behaviour mirrors the existing Place / Combine / Roll buttons to maintain
// architectural symmetry. Business logic is left as a stub for later wiring.
// ─────────────────────────────────────────────────────────────────────────────

import { getUniformScaleFactor }   from '@/config/view';
import { drawMinimalistButton }    from '@/ui/primitives/UIMinimalistButton';
import { ButtonPulseController }   from '@/ui/primitives/controllers/ButtonPulseController';
import { setCursor, restoreCursor } from '@/core/interfaces/events/CursorReporter';
import { getJumpCastIcon }         from '@/ui/overlays/components/icons/jumpCastButton';
import { GlobalMenuReporter }      from '@/core/GlobalMenuReporter';
import { audioManager }            from '@/audio/Audio';

import { ShipRegistry } from '@/game/ship/ShipRegistry';

import type { InputAction }        from '@/core/input/interfaces/InputActions';
import { GamepadButtonAlias }      from '@/core/input/interfaces/GamePadButtonAlias';
import { InputDeviceTracker }      from '@/core/input/InputDeviceTracker';

import { UIButtonTooltipRenderer } from '@/ui/overlays/components/ButtonTooltip';

export class JumpCastButton {
  /* ──────────────────────────── state ──────────────────────────── */
  private isHovered = false;

  private readonly width  = 44;
  private readonly height = 44;

  private x = 0;
  private y = 0;
  private scale = 1;

  private locked = false;

  private readonly tooltip         = new UIButtonTooltipRenderer();
  private readonly pulseController = new ButtonPulseController(5.0, 1.5);

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
    // Position:  place after Combine / Roll cluster (tweak as necessary)
    this.x     = Math.floor(this.canvas.width / 2) + Math.floor(256 * this.scale);
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
      this.globalMenu.setOverlayHovered('jumpCastButton');
    } else {
      this.hoverSoundPlayed = false;
      this.globalMenu.setOverlayNotHovered('jumpCastButton');
      restoreCursor();
    }

    /* activation */
    const clickedMouse = this.isHovered && this.inputManager.wasMouseClicked(true);
    const clickedPad   = this.inputManager.wasActionJustPressed('jumpHome');

    if (!this.locked && (clickedMouse || clickedPad)) {
      if (this.globalMenu.isAnyMenuOpen()) return;
      this.activate();
    }
  }

  /* ───────────────────────── render ────────────────────────────── */
  public render(ctx: CanvasRenderingContext2D): void {
    if (this.globalMenu.isMenuOpen('blockDropDecisionMenu')) return;

    const { x, y } = this.getPosition();
    const finalAlpha = this.pulseController.getPulseAlphaMultiplier(); // always enabled

    drawMinimalistButton(ctx, {
      x, y,
      width : this.width,
      height: this.height,
      iconCanvas: getJumpCastIcon(),
      label: '',
      isHovered: this.isHovered,
      onClick: () => {},                 // handled in update()
      style: {
        borderRadius  : 5 * this.scale,
        fillColor     : '#001122',
        borderColor   : '#AA66FF',   // violet
        textColor     : '#AA66FF',
        highlightColor: '#AA66FF',
        alpha         : finalAlpha,
        fontSize      : 24,
      }
    }, this.scale);

    /* tooltip */
    if (this.isHovered) {
      const sw = this.width * this.scale;
      const hotkey = InputDeviceTracker.getInstance().gamepadLastUsed() ? '(Ⓡ)' : '(H)';
      this.tooltip.render(hotkey, x, y, sw, this.scale);
    }
  }

  /* ──────────────────────── internals ─────────────────────────── */
  /**
   * Fast‑travel activation.
   */
  private activate(): void {
    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    if (playerShip) {
      playerShip.jumpHome();
    }
    this.pulseController.trigger(0.2, 1);
  }

  /* external lock helpers */
  public lock()   { this.locked = true;  }
  public unlock() { this.locked = false; }

  public getIsHovered() { return this.isHovered; }
}
