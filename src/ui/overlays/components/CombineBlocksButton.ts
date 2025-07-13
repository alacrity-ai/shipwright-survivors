// ─────────────────────────────────────────────────────────────────────────────
// src/ui/overlays/components/CombineBlocksButton.ts
//
// “Combine Blocks” – merges three identical-tier blocks into one higher tier.
// UI/behaviour mirrors Roll / Place / Place-All buttons for architectural
// symmetry.
// ─────────────────────────────────────────────────────────────────────────────

import { getUniformScaleFactor }          from '@/config/view';
import { drawMinimalistButton }           from '@/ui/primitives/UIMinimalistButton';
import { ButtonPulseController }          from '@/ui/primitives/controllers/ButtonPulseController';
// import { requestCombineBlocksInQueue }    from '@/core/interfaces/events/BlockQueueReporter';
import { setCursor, restoreCursor }       from '@/core/interfaces/events/CursorReporter';
import { getCombineBlocksIcon }           from '@/ui/overlays/components/icons/combineBlocksButton';
import { GlobalMenuReporter }             from '@/core/GlobalMenuReporter';
import { audioManager }                   from '@/audio/Audio';

import { ShipRegistry } from '@/game/ship/ShipRegistry';

import type { InputAction }               from '@/core/input/interfaces/InputActions';
import { PlayerResources }                from '@/game/player/PlayerResources';
import { GamepadButtonAlias }             from '@/core/input/interfaces/GamePadButtonAlias';
import { InputDeviceTracker }             from '@/core/input/InputDeviceTracker';

import { shakeCamera } from '@/core/interfaces/events/CameraReporter';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';

import { UIButtonTooltipRenderer }        from '@/ui/overlays/components/ButtonTooltip';

export class CombineBlocksButton {
  /* ─────────────────────────────── state ──────────────────────────────── */
  private isHovered = false;

  private readonly width  = 44;
  private readonly height = 44;

  private x = 0;
  private y = 0;
  private scale = 1;

  private locked = false;

  private readonly tooltip          = new UIButtonTooltipRenderer();
  private readonly pulseController  = new ButtonPulseController(0.8, 3.0);

  private readonly globalMenu = GlobalMenuReporter.getInstance();
  private readonly playerRes  = PlayerResources.getInstance();

  private hoverSoundPlayed = false;

  /* ──────────────────────────── ctor / resize ─────────────────────────── */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly inputManager: {
      getMousePosition: () => { x: number; y: number };
      wasMouseClicked: (handlePhysicalInputs: boolean) => boolean;
      wasActionJustPressed: (alias: InputAction) => boolean;
      wasGamepadAliasJustPressed: (alias: GamepadButtonAlias) => boolean;
    }
  ) { this.resize(); }

  public resize(): void {
    this.scale = getUniformScaleFactor();
    this.y     = this.canvas.height - Math.floor(54 * this.scale);
    // Place 52 px to the right of “Place ONE Block”
    this.x     = Math.floor(this.canvas.width / 2) - Math.floor(456 * this.scale);
  }
  private getPosition() { return { x: this.x, y: this.y }; }

  /* ───────────────────────────── update - loop ────────────────────────── */
  public update(dt: number): void {
    if (this.globalMenu.isMenuOpen('blockDropDecisionMenu')) return;

    this.pulseController.update(dt);

    /* ── hover detection ── */
    const mouse = this.inputManager.getMousePosition();
    const { x, y } = this.getPosition();
    const sw = this.width  * this.scale;
    const sh = this.height * this.scale;

    this.isHovered =
      mouse.x >= x && mouse.x <= x + sw &&
      mouse.y >= y && mouse.y <= y + sh;

    /* ── hover FX ── */
    if (this.isHovered) {
      setCursor('hovered');
      if (!this.hoverSoundPlayed) {
        audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 8 });
        this.hoverSoundPlayed = true;
      }
      this.globalMenu.setOverlayHovered('combineBlocksButton');
    } else {
      this.hoverSoundPlayed = false;
      this.globalMenu.setOverlayNotHovered('combineBlocksButton');
      restoreCursor();
    }

    /* ── activation ── */
    const canCombine = this.playerRes.canCombineBlocks?.() ??      // domain helper (preferred)
                       this.playerRes.getMaxDuplicateTierCount() >= 3; // fallback heuristic

    const clickedMouse = this.isHovered && this.inputManager.wasMouseClicked(true);
    const clickedPad   = this.inputManager.wasActionJustPressed('combineBlocksButton');

    if (!this.locked && canCombine && (clickedMouse || clickedPad)) {
      if (this.globalMenu.isAnyMenuOpen()) return;
      this.activate();
    }
  }

  /* ───────────────────────────── render ───────────────────────────────── */
  public render(ctx: CanvasRenderingContext2D): void {
    if (this.globalMenu.isMenuOpen('blockDropDecisionMenu')) return;

    const { x, y } = this.getPosition();
    const canCombine = this.playerRes.canCombineBlocks?.() ??
                       this.playerRes.getMaxDuplicateTierCount() >= 3;

    const baseAlpha  = canCombine ? 1.0 : 0.3;
    const finalAlpha = baseAlpha * this.pulseController.getPulseAlphaMultiplier();

    drawMinimalistButton(ctx, {
      x, y,
      width : this.width,
      height: this.height,
      iconCanvas: getCombineBlocksIcon(),
      label: '',
      isHovered: this.isHovered,
      onClick: () => {},               // handled in update()
      style: {
        borderRadius  : 5 * this.scale,
        fillColor     : '#001122',
        borderColor   : '#00FFFF',
        textColor     : '#00FFFF',
        highlightColor: '#00FFFF',
        alpha         : finalAlpha,
        fontSize      : 24,
      }
    }, this.scale);

    /* tooltip */
    if (this.isHovered) {
      const sw = this.width * this.scale;
      const hotkey = InputDeviceTracker.getInstance().gamepadLastUsed() ? '(X)' : '(F)';
      this.tooltip.render(hotkey, x, y, sw, this.scale);
    }
  }

  /* ─────────────────────────── internals ──────────────────────────────── */
  private activate(): void {
    if (this.locked) {
      console.warn('LOCKED! Returning early!')
    }
    if (this.locked) return;
    audioManager.play('assets/sounds/sfx/ui/gamblewin_01.wav', 'sfx', { maxSimultaneous: 8 });
    shakeCamera(10, 0.2, 10);
    
    PlayerResources.getInstance().combineAllPossibleBlocks();
    this.pulseController.trigger(0.3, 1);

    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    if (playerShip) {
      const { x, y } = playerShip.getTransform().position;
      createLightFlash(x, y, 600, 1.0, 0.4, '#ffffff');
    }
  }

  /* external lock helpers */
  public lock()   { this.locked = true;  }
  public unlock() { this.locked = false; }

  public getIsHovered() { return this.isHovered; }
}
