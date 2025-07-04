import { getUniformScaleFactor } from '@/config/view';
import { drawMinimalistButton } from '@/ui/primitives/UIMinimalistButton';
import { ButtonPulseController } from '@/ui/primitives/controllers/ButtonPulseController';
import { requestPlaceAllBlocksInQueue } from '@/core/interfaces/events/BlockQueueReporter';
import { setCursor, restoreCursor } from '@/core/interfaces/events/CursorReporter';
import { getPlaceAllBlocksIcon } from '@/ui/overlays/components/icons/placeAllButton';
import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';
import { audioManager } from '@/audio/Audio';

import type { InputAction } from '@/core/input/interfaces/InputActions';
import { PlayerResources } from '@/game/player/PlayerResources';

export class PlaceAllBlocksButton {
  private isHovered = false;
  private isActive = false;

  private readonly width = 44;
  private readonly height = 44;

  private x: number = 0;
  private y: number = 0;
  private scale: number = 1;

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
    this.x = Math.floor(this.canvas.width / 2) - Math.floor(300 * this.scale);
  }

  public update(dt: number): void {
    if (this.GlobalMenuReporter.isMenuOpen('blockDropDecisionMenu')) return;

    const blockCount = this.playerResources.getBlockCount();
    this.pulseController.update(dt);

    // Reset activation if block queue is now empty
    if (this.isActive && blockCount === 0) {
      this.isActive = false;
      this.pulseController.stopPulse();
    }

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
      this.GlobalMenuReporter.setOverlayHovered('placeAllBlocksButton');

      if (!this.isActive && this.inputManager.wasMouseClicked() && blockCount > 0) {
        if (this.GlobalMenuReporter.isMenuOpen('blockDropDecisionMenu')) return;
        this.activate();
      }
    } else {
      this.hoverSoundPlayed = false;
      this.GlobalMenuReporter.setOverlayNotHovered('placeAllBlocksButton');
      restoreCursor();
    }

    if (!this.isActive && this.inputManager.wasActionJustPressed('placeAllBlocksButton')) {
      if (this.GlobalMenuReporter.isMenuOpen('blockDropDecisionMenu')) return;
      if (blockCount > 0) {
        this.activate();
      }
    }
  }

  private activate(): void {
    requestPlaceAllBlocksInQueue();
    this.isActive = true;
    this.pulseController.startPulse(0.4, 1);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.GlobalMenuReporter.isMenuOpen('blockDropDecisionMenu')) return;

    const { x, y } = this.getPosition();
    const blockCount = this.playerResources.getBlockCount();

    const baseAlpha = blockCount > 0 ? 1.0 : 0.3;
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
      iconCanvas: getPlaceAllBlocksIcon(),
      label: '',
      isHovered: this.isHovered,
      onClick: () => {}, // no-op: input is handled explicitly
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
  }

  private getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
