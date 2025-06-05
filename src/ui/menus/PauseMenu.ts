// src/ui/menus/PauseMenu.ts

import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton } from '@/ui/primitives/UIButton';

import type { MenuManager } from '@/ui/MenuManager';
import type { UIButton } from '@/ui/primitives/UIButton';
import type { Menu } from '@/ui/interfaces/Menu';
import type { InputManager } from '@/core/InputManager';

export class PauseMenu implements Menu {
  private resumeButton: UIButton;
  private abandonButton: UIButton;
  private settingsButton: UIButton;

  private open = false;

  constructor(
    private readonly inputManager: InputManager,
    private readonly onAbandon: () => void,
    private readonly menuManager: MenuManager
  ) {
    const sharedStyle = {
      borderRadius: 10,
      alpha: 0.9,
      borderColor: '#00ff00',
      backgroundGradient: {
        type: 'linear' as const,
        stops: [
          { offset: 0, color: '#002200' },
          { offset: 1, color: '#001500' }
        ]
      }
    };

    this.settingsButton = {
      x: 160,
      y: 160,
      width: 140,
      height: 40,
      label: 'Settings',
      onClick: () => {
        const settingsMenu = this.menuManager.getMenu('settingsMenu');
        if (!settingsMenu) return;
        this.menuManager.transition(settingsMenu);
      },
      style: sharedStyle
    };

    this.resumeButton = {
      x: 160,
      y: 260,
      width: 140,
      height: 40,
      label: 'Resume',
      onClick: () => this.closeMenu(),
      style: sharedStyle
    };

    this.abandonButton = {
      x: 160,
      y: 210,
      width: 140,
      height: 40,
      label: 'Abandon Mission',
      onClick: () => {
        this.onAbandon();
      },
      style: sharedStyle
    };
  }

  update() {
    const mouse = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();
    if (!mouse) return;

    const { x, y } = mouse;

    this.settingsButton.isHovered =
      x >= this.settingsButton.x && x <= this.settingsButton.x + this.settingsButton.width &&
      y >= this.settingsButton.y && y <= this.settingsButton.y + this.settingsButton.height;

    this.resumeButton.isHovered =
      x >= this.resumeButton.x && x <= this.resumeButton.x + this.resumeButton.width &&
      y >= this.resumeButton.y && y <= this.resumeButton.y + this.resumeButton.height;

    this.abandonButton.isHovered =
      x >= this.abandonButton.x && x <= this.abandonButton.x + this.abandonButton.width &&
      y >= this.abandonButton.y && y <= this.abandonButton.y + this.abandonButton.height;

    if (clicked) {
      if (this.settingsButton.isHovered) {
        this.settingsButton.onClick();
      } else if (this.resumeButton.isHovered) {
        this.resumeButton.onClick();
      } else if (this.abandonButton.isHovered) {
        this.abandonButton.onClick();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    drawWindow({
      ctx,
      x: 120,
      y: 100,
      width: 220,
      height: 240,
      options: {
        alpha: 0.5,
        borderRadius: 12,
        borderColor: '#00ff00',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#002200' },
            { offset: 1, color: '#001500' }
          ]
        }
      }
    });

    drawLabel(ctx, 230, 120, 'Game Paused', {
      font: '16px monospace',
      align: 'center',
      glow: true
    });

    drawButton(ctx, this.settingsButton);
    drawButton(ctx, this.resumeButton);
    drawButton(ctx, this.abandonButton);
  }

  isOpen(): boolean {
    return this.open;
  }

  openMenu(): void {
    this.open = true;
  }

  closeMenu(): void {
    this.open = false;
  }

  isBlocking(): boolean {
    return true;
  }
}
