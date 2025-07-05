// src/ui/overlays/components/PlaceAllBlocksButton.ts

import { getUniformScaleFactor } from '@/config/view';
import { drawMinimalistButton } from '@/ui/primitives/UIMinimalistButton';
import { requestPlaceAllBlocksInQueue } from '@/core/interfaces/events/BlockQueueReporter';
import { setCursor, restoreCursor } from '@/core/interfaces/events/CursorReporter';
import { reportOverlayInteracting } from '@/core/interfaces/events/UIOverlayInteractingReporter';
import { getPlaceAllBlocksIcon } from '@/ui/overlays/components/icons/placeAllButton';
import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';

import type { GamepadButtonAlias } from '@/core/input/interfaces/GamePadButtonAlias';

export class PlaceAllBlocksButton {
  private isHovered = false;

  private readonly width = 42;
  private readonly height = 42;

  private x: number = 0;
  private y: number = 0;
  private scale: number = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly inputManager: {
      getMousePosition: () => { x: number; y: number };
      wasMouseClicked: () => boolean;
      wasGamepadAliasJustPressed: (alias: GamepadButtonAlias) => boolean;
    }
  ) {
    this.resize(); // Initial layout computation
  }

  public resize(): void {
    this.scale = getUniformScaleFactor();
    this.y = this.canvas.height - Math.floor(54 * this.scale); // vertical alignment with block queue
    this.x = Math.floor(this.canvas.width / 2) - Math.floor(300 * this.scale); // offset to left
  }

  public update(dt: number): void {
    const mouse = this.inputManager.getMousePosition();
    const { x, y } = this.getPosition();

    const scaledWidth = this.width * this.scale;
    const scaledHeight = this.height * this.scale;

    this.isHovered =
      mouse.x >= x && mouse.x <= x + scaledWidth &&
      mouse.y >= y && mouse.y <= y + scaledHeight;

    if (this.isHovered) {
      setCursor('hovered');
      reportOverlayInteracting();

      if (this.inputManager.wasMouseClicked()) {
        requestPlaceAllBlocksInQueue();
      }
    } else {
      restoreCursor(); // graceful fallback
    }

    if (this.inputManager.wasGamepadAliasJustPressed('A')) {
      if (GlobalMenuReporter.getInstance().isMenuOpen('powerupSelectionMenu')) return;
      requestPlaceAllBlocksInQueue();
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.getPosition();

    drawMinimalistButton(ctx, {
      x,
      y,
      width: this.width,
      height: this.height,
      iconCanvas: getPlaceAllBlocksIcon(),
      label: '',
      isHovered: this.isHovered,
      isActive: false,
      onClick: requestPlaceAllBlocksInQueue,
      style: {
        borderRadius: 6,
        fillColor: '#001122',
        borderColor: '#00FFFF',
        textColor: '#00FFFF',
        highlightColor: '#00FFFF',
        alpha: 0.9,
        fontSize: 24,
        pulse: false,
      }
    }, this.scale, performance.now() / 1000);
  }

  private getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
