// src/ui/overlays/components/RollBlocksButton.ts

import { getUniformScaleFactor } from '@/config/view';
import { drawMinimalistButton } from '@/ui/primitives/UIMinimalistButton';
import { ButtonPulseController } from '@/ui/primitives/controllers/ButtonPulseController';
import { requestRollBlocksQueue } from '@/core/interfaces/events/BlockQueueReporter';
import { setCursor, restoreCursor } from '@/core/interfaces/events/CursorReporter';
import { getRollBlocksIcon } from '@/ui/overlays/components/icons/rollBlocksButton';
import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';
import { audioManager } from '@/audio/Audio';

import { UIButtonTooltipRenderer } from '@/ui/overlays/components/ButtonTooltip';

import type { InputAction } from '@/core/input/interfaces/InputActions';
import { PlayerResources } from '@/game/player/PlayerResources';
import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';

export class RollBlocksButton {
  private isHovered = false;

  private readonly width = 44;
  private readonly height = 44;

  private x: number = 0;
  private y: number = 0;
  private scale: number = 1;

  private locked: boolean = false;

  private readonly tooltip = new UIButtonTooltipRenderer();

  private hoverSoundPlayed = false;
  private readonly pulseController = new ButtonPulseController(0.8, 3.0);
  private readonly GlobalMenuReporter = GlobalMenuReporter.getInstance();
  private readonly playerResources = PlayerResources.getInstance();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly inputManager: {
      getMousePosition: () => { x: number; y: number };
      wasMouseClicked: () => boolean;
      wasActionJustPressed: (alias: InputAction) => boolean;
    }
  ) {
    this.resize();
  }

  public resize(): void {
    this.scale = getUniformScaleFactor();
    this.y = this.canvas.height - Math.floor(54 * this.scale);
    this.x = Math.floor(this.canvas.width / 2) - Math.floor(404 * this.scale);
  }

  public lock(): void {
    this.locked = true;
  }

  public unlock(): void {
    this.locked = false;
  }

  public getIsHovered(): boolean {
    return this.isHovered;
  }

  public update(dt: number): void {
    if (this.GlobalMenuReporter.isMenuOpen('blockDropDecisionMenu')) return;

    const blockCount = this.playerResources.getBlockCount();
    this.pulseController.update(dt);

    const mouse = this.inputManager.getMousePosition();
    const { x, y } = this.getPosition();

    const scaledWidth = this.width * this.scale;
    const scaledHeight = this.height * this.scale;

    this.isHovered =
      mouse.x >= x && mouse.x <= x + scaledWidth &&
      mouse.y >= y && mouse.y <= y + scaledHeight;

    if (this.isHovered) {
      setCursor('hovered');
      if (!this.hoverSoundPlayed) {
        audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 8 });
        this.hoverSoundPlayed = true;
      }
      this.GlobalMenuReporter.setOverlayHovered('rollBlocksButton');

      if (this.inputManager.wasMouseClicked() && blockCount >= 3) {
        this.activate();
      }
    } else {
      this.hoverSoundPlayed = false;
      this.GlobalMenuReporter.setOverlayNotHovered('rollBlocksButton');
      restoreCursor();
    }

    if (this.inputManager.wasActionJustPressed('rollBlocksButton') && blockCount >= 3) {
      if (this.GlobalMenuReporter.isAnyMenuOpen()) return;
      this.activate();
    }
  }

  private activate(): void {
    if (this.locked) return;
    requestRollBlocksQueue();
    this.pulseController.trigger(0.3, 1);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.GlobalMenuReporter.isMenuOpen('blockDropDecisionMenu')) return;

    const { x, y } = this.getPosition();
    const blockCount = this.playerResources.getBlockCount();

    const baseAlpha = blockCount >= 3 ? 1.0 : 0.3;
    const pulseAlpha = this.pulseController.getPulseAlphaMultiplier();
    const finalAlpha = baseAlpha * pulseAlpha;

    const fillColor = '#001122';
    const borderColor = '#00FFFF';
    const textColor = '#00FFFF';
    const highlightColor = '#00FFFF';

    drawMinimalistButton(ctx, {
      x,
      y,
      width: this.width,
      height: this.height,
      iconCanvas: getRollBlocksIcon(),
      label: '',
      isHovered: this.isHovered,
      onClick: () => {}, // input handled explicitly
      style: {
        borderRadius: 5 * this.scale,
        fillColor,
        borderColor,
        textColor,
        highlightColor,
        alpha: finalAlpha,
        fontSize: 24,
      }
    }, this.scale);

    if (this.isHovered) {
      const sw = this.width * this.scale;
      const hotkey = InputDeviceTracker.getInstance().gamepadLastUsed() ? '(Y)' : '(R)';
      this.tooltip.render(hotkey, x, y, sw, this.scale);
    }
  }

  private getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
