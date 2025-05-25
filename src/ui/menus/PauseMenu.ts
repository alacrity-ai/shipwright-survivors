// src/ui/PauseMenu.ts

import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton } from '@/ui/primitives/UIButton';
import type { UIButton } from '@/ui/primitives/UIButton';
import type { Menu } from '@/ui/interfaces/Menu';
import type { MenuManager } from '@/ui/MenuManager';
import { getMousePosition } from '@/core/Input';

export class PauseMenu implements Menu {
  private resumeButton: UIButton;

  constructor(private readonly menuManager: MenuManager) {
    this.resumeButton = {
      x: 160,
      y: 190,
      width: 140,
      height: 40,
      label: 'Resume',
      onClick: () => this.menuManager.close(),
    };
  }

  update(dt: number) {
    const mouse = getMousePosition?.();
    if (!mouse) return;

    const { x, y } = mouse;
    this.resumeButton.isHovered =
      x >= this.resumeButton.x &&
      x <= this.resumeButton.x + this.resumeButton.width &&
      y >= this.resumeButton.y &&
      y <= this.resumeButton.y + this.resumeButton.height;

    window.addEventListener('mousedown', (e) => {
      if (this.resumeButton.isHovered) {
        this.resumeButton.onClick();
        e.preventDefault();
      }
    }, { once: true });
  }

  render(ctx: CanvasRenderingContext2D) {
    drawWindow(ctx, 120, 100, 220, 140, 'Pause');
    drawLabel(ctx, 190, 160, 'Game Paused', { font: '16px sans-serif', align: 'center' });
    drawButton(ctx, this.resumeButton);
  }

  isBlocking(): boolean {
    return true;
  }
}
