// src/ui/overlays/components/PlaceBlockButton.ts
//
// “Place ONE Block” – momentary flash on click, no queue-size bookkeeping.
//

import { getUniformScaleFactor }         from '@/config/view';
import { drawMinimalistButton }          from '@/ui/primitives/UIMinimalistButton';
import { ButtonPulseController }         from '@/ui/primitives/controllers/ButtonPulseController';
import { requestPlaceFirstBlockInQueue } from '@/core/interfaces/events/BlockQueueReporter';
import { setCursor, restoreCursor }      from '@/core/interfaces/events/CursorReporter';
import { getPlaceOneBlockIcon }          from '@/ui/overlays/components/icons/placeOneBlockButton';
import { GlobalMenuReporter }            from '@/core/GlobalMenuReporter';
import { audioManager }                  from '@/audio/Audio';

import type { InputAction }              from '@/core/input/interfaces/InputActions';
import { PlayerResources }               from '@/game/player/PlayerResources';
import { GamepadButtonAlias }            from '@/core/input/interfaces/GamePadButtonAlias';
import { InputDeviceTracker }            from '@/core/input/InputDeviceTracker';

import { UIButtonTooltipRenderer } from '@/ui/overlays/components/ButtonTooltip';

export class PlaceBlockButton {
  /* ──────────────────────────────── state ─────────────────────────────── */
  private isHovered = false;
  private isCooling = false;           // block repeat-spam during 0.3-s flash

  private readonly width  = 44;
  private readonly height = 44;

  private x = 0;
  private y = 0;
  private scale = 1;

  private locked = false;

  private readonly tooltip = new UIButtonTooltipRenderer();

  private hoverSoundPlayed = false;
  private readonly pulseController = new ButtonPulseController(0.12, 3.0);

  private readonly globalMenu = GlobalMenuReporter.getInstance();
  private readonly playerRes  = PlayerResources.getInstance();

  /* ─────────────────────────── lifecycle / ctor ───────────────────────── */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly inputManager: {
      getMousePosition: () => { x: number; y: number };
      wasMouseClicked: (phys: boolean) => boolean;
      wasActionJustPressed: (alias: InputAction) => boolean;
      wasGamepadAliasJustPressed: (alias: GamepadButtonAlias) => boolean;
    }
  ) {
    this.resize();
  }

  /* ───────────────────────────── geometry ─────────────────────────────── */
  public resize(): void {
    this.scale = getUniformScaleFactor();
    this.y     = this.canvas.height - Math.floor(54 * this.scale);
    this.x     = Math.floor(this.canvas.width / 2) - Math.floor(300 * this.scale);
  }
  private getPosition() { return { x: this.x, y: this.y }; }

  /* ───────────────────────────── update loop ──────────────────────────── */
  public update(dt: number): void {
    if (this.globalMenu.isMenuOpen('blockDropDecisionMenu')) return;

    this.pulseController.update(dt);
    if (this.isCooling && !this.pulseController.isActive?.()) {
      this.isCooling = false;                 // pulse finished; ready for next click
    }

    /* hover calc */
    const mouse = this.inputManager.getMousePosition();
    const { x, y } = this.getPosition();
    const sw = this.width * this.scale;
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
      this.globalMenu.setOverlayHovered('placeBlockButton');
    } else {
      this.hoverSoundPlayed = false;
      this.globalMenu.setOverlayNotHovered('placeBlockButton');
      restoreCursor();
    }

    /* click handling */
    const blockCount = this.playerRes.getBlockCount();
    const clickedMouse  = this.isHovered && this.inputManager.wasMouseClicked(true);
    const clickedPad    = this.inputManager.wasActionJustPressed('placeBlockButton');

    if (!this.locked && !this.isCooling && blockCount > 0 && (clickedMouse || clickedPad)) {
      if (this.globalMenu.isAnyMenuOpen()) return;
      if (this.globalMenu.hasSpecialBlocker('planet-interaction-overlay')
          && InputDeviceTracker.getInstance().gamepadLastUsed()) return;
      this.activate();
    }
  }

  /* ───────────────────────────── render ───────────────────────────────── */
  public render(ctx: CanvasRenderingContext2D): void {
    if (this.globalMenu.isMenuOpen('blockDropDecisionMenu')) return;

    const { x, y } = this.getPosition();
    const blockCount = this.playerRes.getBlockCount();

    const baseAlpha  = blockCount > 0 ? 1.0 : 0.3;
    const pulseAlpha = this.pulseController.getPulseAlphaMultiplier();
    const finalAlpha = baseAlpha * pulseAlpha;

    drawMinimalistButton(ctx, {
      x, y,
      width : this.width,
      height: this.height,
      iconCanvas: getPlaceOneBlockIcon(),
      label: '',
      isHovered: this.isHovered,
      onClick: () => {}, // handled in update()
      style: {
        borderRadius : 5 * this.scale,
        fillColor    : '#001122',
        borderColor  : '#00FFFF',
        textColor    : '#00FFFF',
        highlightColor: '#00FFFF',
        alpha        : finalAlpha,
        fontSize     : 24,
      }
    }, this.scale);

    if (this.isHovered) {
      const sw = this.width * this.scale;
      const hotkey = InputDeviceTracker.getInstance().gamepadLastUsed() ? '(A)' : '(Q)';
      this.tooltip.render(hotkey, x, y, sw, this.scale);
    }
  }

  /* ─────────────────────────── internals ──────────────────────────────── */
  private activate(): void {
    requestPlaceFirstBlockInQueue();
    this.isCooling = true;
    this.pulseController.trigger(0.1, 1);      // 0.3-s flash, 1× amplitude
  }

  /* external lock helpers */
  public lock()   { this.locked = true;  }
  public unlock() { this.locked = false; }

  public getIsHovered() { return this.isHovered; }
}
