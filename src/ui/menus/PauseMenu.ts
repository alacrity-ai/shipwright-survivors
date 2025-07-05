// src/ui/menus/PauseMenu.ts

import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton } from '@/ui/primitives/UIButton';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { getUniformScaleFactor } from '@/config/view';
import { addPostProcessEffect, removePostProcessEffect } from '@/core/interfaces/events/PostProcessingEffectReporter';
import { flags } from '@/game/player/PlayerFlagManager';

import { DEFAULT_CONFIG } from '@/config/ui';

import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';
import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';

import type { MenuManager } from '@/ui/MenuManager';
import type { UIButton } from '@/ui/primitives/UIButton';
import type { Menu } from '@/ui/interfaces/Menu';
import type { InputManager } from '@/core/InputManager';

export class PauseMenu implements Menu {
  private resumeButton: UIButton;
  private abandonButton: UIButton;
  private settingsButton: UIButton;
  private sharedStyle: UIButton['style'];
  private disabledStyle: UIButton['style'];

  private open = false;

  // Window position constants
  private readonly windowX = 120;
  private readonly windowY = 100;
  private readonly windowWidth = 240;
  private readonly windowHeight = 260;

  // Button size constants
  private readonly buttonWidth = 140;
  private readonly buttonHeight = 40;

  // Gamepad input
  private navManager: GamepadMenuInteractionManager;

  constructor(
    private readonly inputManager: InputManager,
    private readonly onAbandon: () => void,
    private readonly menuManager: MenuManager,
  ) {
    // Gamepad interaction
    this.navManager = new GamepadMenuInteractionManager(inputManager);

    // Style definitions
    this.sharedStyle = { 
      ...DEFAULT_CONFIG.button.style,
      textFont: '12px monospace'  
    };

    this.disabledStyle = {
      borderRadius: 10,
      alpha: 0.5,
      borderColor: '#445544',
      backgroundGradient: {
        type: 'linear' as const,
        stops: [
          { offset: 0, color: '#111911' },
          { offset: 1, color: '#0a120a' }
        ]
      }
    };

    // These are instantiated later in `initialize()`
    this.settingsButton = {} as UIButton;
    this.abandonButton = {} as UIButton;
    this.resumeButton = {} as UIButton;

    this.initialize();
  }

  private initialize(): void {
    const scale = getUniformScaleFactor();

    const scaledButtonHeight = this.buttonHeight * scale;
    const scaledSpacing = scaledButtonHeight * 0.5;

    const scaledWindowWidth = this.windowWidth * scale;
    const scaledWindowHeight = this.windowHeight * scale;

    const baseX = 0.2 * scaledWindowWidth + this.windowX;
    const baseY = 0.2 * scaledWindowHeight + this.windowY;

    this.settingsButton = {
      x: baseX,
      y: baseY,
      width: this.buttonWidth, // Set these as the unscaled values
      height: this.buttonHeight, // They will be scaled via uiScale argument
      label: 'Settings',
      onClick: () => {
        const settingsMenu = this.menuManager.getMenu('settingsMenu');
        if (settingsMenu) {
          this.menuManager.transition(settingsMenu);
          GlobalMenuReporter.getInstance().setMenuClosed('pauseMenu');
        }
      },
      style: this.sharedStyle
    };

    this.abandonButton = {
      x: baseX,
      y: baseY + (scaledSpacing * 1) + (scaledButtonHeight * 1),
      width: this.buttonWidth,
      height: this.buttonHeight,
      label: 'Abandon Mission',
      onClick: flags.has('mission.intro-briefing.complete') ? this.onAbandon : () => {},
      style: flags.has('mission.intro-briefing.complete') ? this.sharedStyle : this.disabledStyle
    };

    this.resumeButton = {
      x: baseX,
      y: baseY + (scaledSpacing * 2) + (scaledButtonHeight * 2),
      width: this.buttonWidth,
      height: this.buttonHeight,
      label: 'Resume',
      onClick: () => {
        this.menuManager.close(this);
        this.menuManager.resume();
      },
      style: this.sharedStyle
    };
  }

  update(): void {
    const scale = getUniformScaleFactor();
    const mouse = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    // === Gamepad nav update (stick + dpad)
    this.navManager.update();

    const buttons = [this.settingsButton, this.abandonButton, this.resumeButton];

    const { x, y } = mouse ?? { x: -1, y: -1 };
    for (const btn of buttons) {
      const rect = { x: btn.x, y: btn.y, width: btn.width, height: btn.height };
      btn.isHovered = isMouseOverRect(x, y, rect, scale);
    }

    // Shared click behavior, now works for mouse and virtual mouse via nav
    if (clicked) {
      if (this.settingsButton.isHovered) this.settingsButton.onClick();
      else if (this.abandonButton.isHovered) this.abandonButton.onClick();
      else if (this.resumeButton.isHovered) this.resumeButton.onClick();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const scale = getUniformScaleFactor();

    drawWindow({
      ctx,
      x: this.windowX,
      y: this.windowY,
      width: this.windowWidth,
      height: this.windowHeight,
      uiScale: scale,
      options: DEFAULT_CONFIG.window.options
    });

    drawLabel(
      ctx,
      this.windowX + (this.windowWidth * scale) / 2,
      this.windowY + (10 * scale),
      'Game Paused',
      {
        font: '16px monospace',
        align: 'center',
        glow: true,
      },
      scale
    );

    drawButton(ctx, this.settingsButton, scale);
    drawButton(ctx, this.abandonButton, scale);
    drawButton(ctx, this.resumeButton, scale);
  }

  isOpen(): boolean {
    return this.open;
  }

  openMenu(): void {
    this.initialize();
    this.open = true;
    GlobalMenuReporter.getInstance().setMenuOpen('pauseMenu');
    addPostProcessEffect('blackwhite');

    const usingGamepad = this.inputManager.isUsingGamepad?.() ?? false;
    if (usingGamepad) {
      const scale = getUniformScaleFactor();

      const navPoints = [
        {
          button: this.settingsButton,
          gridX: 0,
          gridY: 0,
        },
        {
          button: this.abandonButton,
          gridX: 0,
          gridY: 1,
        },
        {
          button: this.resumeButton,
          gridX: 0,
          gridY: 2,
        },
      ]
        .filter(({ button }) => button && button.style !== this.disabledStyle)
        .map(({ button, gridX, gridY }) => {
          const centerX = button.x + (button.width * scale) / 2;
          const centerY = button.y + (button.height * scale) / 2;

          return {
            gridX,
            gridY,
            screenX: centerX,
            screenY: centerY,
            isEnabled: true,
          };
        });

      this.navManager.setNavMap(navPoints);
    } else {
      this.navManager.clearNavMap();
    }
  }

  closeMenu(): void {
    this.open = false;
    GlobalMenuReporter.getInstance().setMenuClosed('pauseMenu');
    removePostProcessEffect('blackwhite');
    this.navManager.clearNavMap();
  }

  isBlocking(): boolean {
    return true;
  }
}
