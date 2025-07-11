// src/game/planets/PlanetInteractionOptionsMenu.ts

import { DEFAULT_CONFIG } from '@/config/ui';

import { CanvasManager } from '@/core/CanvasManager';
import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { getUniformScaleFactor } from '@/config/view';

import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';
import { audioManager } from '@/audio/Audio';

import { PlanetRegistry } from '@/game/planets/PlanetRegistry';
import type { PlanetDefinition } from './interfaces/PlanetDefinition';

import { GlobalEventBus } from '@/core/EventBus';
import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';
import { openJumpCastMenu } from '@/core/interfaces/events/PlanetMenusReporter';
import { openTradepostMenu } from '@/core/interfaces/events/TradePostReporter';

import { pauseRuntime, resumeRuntime } from '@/core/interfaces/events/RuntimeReporter';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

import type { InputManager } from '@/core/InputManager';

const getStyle = (btn: UIButton) => (btn.style ??= {});

export class PlanetInteractionOptionsMenu {
  // === Dependencies ===
  private readonly inputManager: InputManager;
  private readonly navManager: GamepadMenuInteractionManager;
  private readonly canvasManager: CanvasManager;
  private readonly ctx: CanvasRenderingContext2D;

  // === State ===
  private open = false;
  private planetId: string | null = null;
  private jumpEnabled = true;

  // === Layout ===
  private windowX = 80;
  private windowY = 80;
  private windowYOffset = 46;
  private windowWidth = 360;
  private windowHeight = 260;

  private buttonWidth = 160;
  private buttonHeight = 44;
  private buttonPadding = 20;

  // === UI elements ===
  private readonly tradePostButton: UIButton;
  private readonly jumpCastButton: UIButton;
  private readonly closeButton: UIButton;

  // === Event binding ===
  private readonly boundOpenMenu = (payload: { planetDefinition: PlanetDefinition }) => {
    this.openMenu(payload.planetDefinition.name);
  };

  constructor(inputManager: InputManager) {
    this.inputManager  = inputManager;
    this.canvasManager = CanvasManager.getInstance();
    this.ctx           = this.canvasManager.getContext('ui');
    this.navManager    = new GamepadMenuInteractionManager(this.inputManager);

    // --- Button definitions ---
    this.tradePostButton = this.makeButton('Trade Post', () => {
      this.closeMenu();
      const planetDefinition = PlanetRegistry.getPlanetByName(this.planetId!);
      openTradepostMenu(planetDefinition.tradePostId!);
    });

    this.jumpCastButton = this.makeButton('Jump', () => {
      this.closeMenu();
      openJumpCastMenu();
    });

    this.closeButton = this.makeButton('Close', () => this.closeMenu());

    // Register global listener
    GlobalEventBus.on('planet:interaction:options:open', this.boundOpenMenu);
    GlobalEventBus.on('planet:interaction:options:disable-jump', this.handleJumpDisable);
    GlobalEventBus.on('planet:interaction:options:enable-jump',  this.handleJumpEnable);
  }

  // -------------------------------------------------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------------------------------------------------

  openMenu(planetId: string): void {
    pauseRuntime();
    this.planetId = planetId;
    this.open     = true;
    this.resize();
    this.recomputeNavMap();

    // Get player ship and set this as home coordinate
    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    if (playerShip) {
      const { x, y } = playerShip.getTransform().position;
      playerShip.setHomeCoordinates(x, y);
    }

    GlobalMenuReporter.getInstance().setMenuOpen('planetInteractionOptions');
    audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx');
  }

  isOpen(): boolean {
    return this.open;
  }

  closeMenu(): void {
    if (!this.open) return;

    resumeRuntime();
    this.open  = false;
    this.navManager.clearNavMap();
    GlobalMenuReporter.getInstance().setMenuClosed('planetInteractionOptions');
  }

  destroy(): void {
    GlobalEventBus.off('planet:interaction:options:open',        this.boundOpenMenu);
    GlobalEventBus.off('planet:interaction:options:disable-jump', this.handleJumpDisable);
    GlobalEventBus.off('planet:interaction:options:enable-jump',  this.handleJumpEnable);
  }

  // -------------------------------------------------------------------------------------------------------------------
  // Frame lifecycle
  // -------------------------------------------------------------------------------------------------------------------

  update(dt: number): void {
    if (!this.open) return;

    const mouse   = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    this.navManager.update();

    const { x, y } = mouse ?? { x: -1, y: -1 };

    // Hover/click processing – skip disabled Jump button
    [this.tradePostButton, this.jumpCastButton, this.closeButton].forEach(btn => {
      if (btn === this.jumpCastButton && !this.jumpEnabled) return;

      const rect = { x: btn.x, y: btn.y, width: btn.width, height: btn.height };
      btn.isHovered = isMouseOverRect(x, y, rect, 1.0);

      if (clicked && btn.isHovered) btn.onClick();
    });

    // Game-pad cancel → Close
    if (this.inputManager.wasActionJustPressed('cancel') || this.inputManager.wasKeyJustPressed('Escape')) this.closeMenu();
  }

  render(): void {
    if (!this.open) return;

    const scale = getUniformScaleFactor();
    const ctx   = this.ctx;

    // Window
    drawMinimalistWindow(
      ctx,
      this.windowX,
      this.windowY,
      this.windowWidth,
      this.windowHeight,
      { ...DEFAULT_CONFIG.window.options, alpha: 0.6 },
    );

    // Title (Planet-specific if desired)
    drawLabel(
      ctx,
      this.windowX + this.windowWidth / 2,
      this.windowY - 24 * scale,
      'Planet Services',
      {
        font : `${14 * scale}px monospace`,
        align: 'center',
        glow : true,
      },
    );

    // Buttons (only draw Jump when enabled)
    drawButton(ctx, this.tradePostButton, 1.0, 13 * scale);
    if (this.jumpEnabled) {
      const alpha = getStyle(this.jumpCastButton).alpha ?? 1.0;
      drawButton(ctx, this.jumpCastButton, alpha, 13 * scale);
    }
    drawButton(ctx, this.closeButton, 1.0, 13 * scale);
  }

  // -------------------------------------------------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------------------------------------------------

  private readonly handleJumpDisable = (): void => {
    if (!this.jumpEnabled) return;
    this.jumpEnabled = false;

    getStyle(this.jumpCastButton).alpha = 0.35;
    this.jumpCastButton.onClick         = () => {};
    this.recomputeNavMap();
  };

  private readonly handleJumpEnable = (): void => {
    if (this.jumpEnabled) return;
    this.jumpEnabled = true;

    getStyle(this.jumpCastButton).alpha = 1.0;
    this.jumpCastButton.onClick         = () => {
      this.closeMenu();
      openJumpCastMenu();
    };
    this.recomputeNavMap();
  };

  private makeButton(label: string, onClick: () => void): UIButton {
    return {
      x: 0, y: 0, width: this.buttonWidth, height: this.buttonHeight,
      label,
      isHovered    : false,
      wasHovered   : false,
      onClick,
      style        : { textFont: `${13 * getUniformScaleFactor()}px monospace` },
      ...DEFAULT_CONFIG.button.style,
    };
  }

  private resize(): void {
    const scale          = getUniformScaleFactor();
    const viewportWidth  = this.canvasManager.getCanvas('ui').width;
    const viewportHeight = this.canvasManager.getCanvas('ui').height;

    this.windowWidth  = 320 * scale;
    this.windowHeight = 280 * scale;
    this.windowYOffset = 40 * scale;

    this.windowX = (viewportWidth  - this.windowWidth)  / 2;
    this.windowY = (viewportHeight - this.windowHeight) / 2 + this.windowYOffset;

    this.buttonWidth  = 180 * scale;
    this.buttonHeight = 46 * scale;
    this.buttonPadding = 24 * scale;

    // Position buttons vertically
    const btnStartX = this.windowX + (this.windowWidth - this.buttonWidth) / 2;
    let   btnY      = this.windowY + 60 * scale;

    [this.tradePostButton, this.jumpCastButton, this.closeButton].forEach(btn => {
      btn.x = btnStartX;
      btn.y = btnY;
      btn.width  = this.buttonWidth;
      btn.height = this.buttonHeight;
      btnY += this.buttonHeight + this.buttonPadding;
    });
  }

  private recomputeNavMap(): void {
    this.navManager.clearNavMap();

    const nodes = [
      {
        gridX: 0, gridY: 0,
        screenX: this.tradePostButton.x + this.tradePostButton.width / 2,
        screenY: this.tradePostButton.y + this.tradePostButton.height / 2,
        isEnabled: true,
      },
    ];

    if (this.jumpEnabled) {
      nodes.push({
        gridX: 0, gridY: 1,
        screenX: this.jumpCastButton.x + this.jumpCastButton.width / 2,
        screenY: this.jumpCastButton.y + this.jumpCastButton.height / 2,
        isEnabled: true,
      });
    }

    nodes.push({
      gridX: 0, gridY: this.jumpEnabled ? 2 : 1,
      screenX: this.closeButton.x + this.closeButton.width / 2,
      screenY: this.closeButton.y + this.closeButton.height / 2,
      isEnabled: true,
    });

    this.navManager.setNavMap(nodes);
  }
}
