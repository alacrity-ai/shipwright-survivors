// src/game/planets/PlanetInteractionOptionsMenu.ts
// ─────────────────────────────────────────────────────────────────────────────
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
import { openQuestsMenu } from '@/core/interfaces/events/QuestReporter';

import { pauseRuntime, resumeRuntime } from '@/core/interfaces/events/RuntimeReporter';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

import type { InputManager } from '@/core/InputManager';

const styleOf = (btn: UIButton) => (btn.style ??= {});

export class PlanetInteractionOptionsMenu {
  // ──────────────────────────────────────────
  // Dependencies
  // ──────────────────────────────────────────
  private readonly input: InputManager;
  private readonly nav  : GamepadMenuInteractionManager;
  private readonly cm   : CanvasManager;
  private readonly ctx  : CanvasRenderingContext2D;

  // ──────────────────────────────────────────
  // State
  // ──────────────────────────────────────────
  private open = false;
  private lastHoveredBtn: UIButton | null = null;
  private planetId: string | null = null;

  private jumpEnabled = true;
  private contractsEnabled = true;

  // ──────────────────────────────────────────
  // Layout
  // ──────────────────────────────────────────
  private winX = 0; private winY = 0;
  private winW = 360; private winH = 260;
  private buttonW = 160; private buttonH = 44;
  private padY = 20;

  // ──────────────────────────────────────────
  // UI Buttons
  // ──────────────────────────────────────────
  private readonly tradePostBtn : UIButton;
  private readonly contractsBtn : UIButton;
  private readonly jumpBtn      : UIButton;
  private readonly closeBtn     : UIButton;

  // ──────────────────────────────────────────
  // Event binding
  // ──────────────────────────────────────────
  private readonly boundOpen = (p:{ planetDefinition: PlanetDefinition }) =>
    this.openMenu(p.planetDefinition.name);

  constructor(input: InputManager) {
    this.input = input;
    this.cm    = CanvasManager.getInstance();
    this.ctx   = this.cm.getContext('overlay');
    this.nav   = new GamepadMenuInteractionManager(this.input);

    /* ---------- Button Definitions ---------- */
    this.tradePostBtn = this.makeButton('Trade Post', () => {
      this.closeMenu();
      const def = PlanetRegistry.getPlanetByName(this.planetId!);
      audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx', { maxSimultaneous: 4 });
      openTradepostMenu(def.tradePostId!);
    });

    this.contractsBtn = this.makeButton('Contracts', () => {
      this.closeMenu();
      audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx', { maxSimultaneous: 4 });
      openQuestsMenu(this.planetId!);
    });

    this.jumpBtn = this.makeButton('Jump', () => {
      this.closeMenu();
      audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx', { maxSimultaneous: 4 });
      openJumpCastMenu();
    });

    this.closeBtn = this.makeButton('Close', () => {
      audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 4 });
      this.closeMenu();
    });

    /* ---------- Global listeners ---------- */
    GlobalEventBus.on('planet:interaction:options:open',        this.boundOpen);
    GlobalEventBus.on('planet:interaction:options:disable-jump', this.handleJumpDisable);
    GlobalEventBus.on('planet:interaction:options:enable-jump',  this.handleJumpEnable);
    GlobalEventBus.on('planet:interaction:options:enable-contracts', this.handleContractsEnable);
    GlobalEventBus.on('planet:interaction:options:disable-contracts', this.handleContractsDisable);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════════════════
  openMenu(planetId: string): void {
    pauseRuntime();
    this.planetId = planetId;
    this.open = true;

    // Mark home coordinates
    const ship = ShipRegistry.getInstance().getPlayerShip();
    if (ship) {
      const { x, y } = ship.getTransform().position;
      ship.setHomeCoordinates(x, y);
    }

    this.resize(); this.recomputeNavMap();
    GlobalMenuReporter.getInstance().setMenuOpen('planetInteractionOptions');
    audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx');
  }

  isOpen(): boolean { return this.open; }

  closeMenu(): void {
    if (!this.open) return;
    resumeRuntime();
    this.open = false;
    this.nav.clearNavMap();
    GlobalMenuReporter.getInstance().setMenuClosed('planetInteractionOptions');
  }

  destroy(): void {
    GlobalEventBus.off('planet:interaction:options:open',        this.boundOpen);
    GlobalEventBus.off('planet:interaction:options:disable-jump', this.handleJumpDisable);
    GlobalEventBus.off('planet:interaction:options:enable-jump',  this.handleJumpEnable);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Frame Lifecycle
  // ═══════════════════════════════════════════════════════════════════════════
  update(dt: number): void {
    if (!this.open) return;

    const mouse    = this.input.getMousePosition();
    const clicked  = this.input.wasMouseClicked();
    const { x: mx, y: my } = mouse ?? { x: -1, y: -1 };

    this.nav.update();

    [this.tradePostBtn, this.contractsBtn, this.jumpBtn, this.closeBtn].forEach(btn => {
      if (btn.disabled) return;                               // ← NEW: ignore disabled
      const r = { x: btn.x, y: btn.y, width: btn.width, height: btn.height };
      btn.isHovered = isMouseOverRect(mx, my, r, 1.0);
      if (btn.isHovered && btn !== this.lastHoveredBtn) {
        audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 4 });
        this.lastHoveredBtn = btn;
      }
      if (clicked && btn.isHovered) btn.onClick();
    });

    if (!this.tradePostBtn.isHovered && !this.contractsBtn.isHovered &&
        !this.jumpBtn.isHovered      && !this.closeBtn.isHovered) {
      this.lastHoveredBtn = null;
    }

    if (this.input.wasActionJustPressed('cancel') || this.input.wasKeyJustPressed('Escape')) {
      this.closeMenu();
    }
  }

  render(): void {
    if (!this.open) return;

    const scale = getUniformScaleFactor();
    const ctx   = this.ctx;

    drawMinimalistWindow(ctx, this.winX, this.winY, this.winW, this.winH,
                        { ...DEFAULT_CONFIG.window.options, alpha: 0.6 });

    drawLabel(ctx,
              this.winX + this.winW / 2,
              this.winY - 24 * scale,
              'Planet Services',
              { font: `${14 * scale}px monospace`, align: 'center', glow: true });

    // Always draw; drawButton handles .disabled internally
    drawButton(ctx, this.tradePostBtn , 1, 13 * scale);
    drawButton(ctx, this.contractsBtn , 1, 13 * scale);
    drawButton(ctx, this.jumpBtn      , 1, 13 * scale);
    drawButton(ctx, this.closeBtn     , 1, 13 * scale);
  }

  /* ──────────────────────────────────────────────────────────────
  *  Enable / Disable Handlers
  * ──────────────────────────────────────────────────────────── */

  private readonly handleJumpDisable = (): void => {
    if (!this.jumpEnabled) return;
    this.jumpEnabled = false;

    this.jumpBtn.disabled = true;
    this.jumpBtn.onClick  = () => {};
    this.recomputeNavMap();
  };

  private readonly handleJumpEnable = (): void => {
    if (this.jumpEnabled) return;
    this.jumpEnabled = true;

    this.jumpBtn.disabled = false;
    this.jumpBtn.onClick  = () => {
      this.closeMenu();
      openJumpCastMenu();
    };
    this.recomputeNavMap();
  };

  private readonly handleContractsDisable = (): void => {
    if (!this.contractsEnabled) return;
    this.contractsEnabled   = false;

    this.contractsBtn.disabled = true;
    this.contractsBtn.onClick  = () => {};
    this.recomputeNavMap();
  };

  private readonly handleContractsEnable = (): void => {
    if (this.contractsEnabled) return;
    this.contractsEnabled   = true;

    this.contractsBtn.disabled = false;
    this.contractsBtn.onClick  = () => {
      this.closeMenu();
      openQuestsMenu(this.planetId!);
    };
    this.recomputeNavMap();
  };

  private makeButton(label: string, onClick: () => void): UIButton {
    return {
      x: 0, y: 0, width: this.buttonW, height: this.buttonH,
      label, onClick,
      isHovered: false, wasHovered: false,
      style: { textFont: `${13 * getUniformScaleFactor()}px monospace` },
      ...DEFAULT_CONFIG.button.style,
    };
  }

  private resize(): void {
    const scale = getUniformScaleFactor();
    const vpW = this.cm.getCanvas('overlay').width;
    const vpH = this.cm.getCanvas('overlay').height;

    this.winW = 320 * scale;
    this.winH = 300 * scale;  // ↑ slightly taller for extra button
    this.winX = (vpW - this.winW) / 2;
    this.winY = (vpH - this.winH) / 2 + 40 * scale;

    this.buttonW = 180 * scale;
    this.buttonH = 46 * scale;
    this.padY = 20 * scale;

    // Vertical stack
    const startX = this.winX + (this.winW - this.buttonW) / 2;
    let y = this.winY + 28 * scale;

    [this.tradePostBtn, this.contractsBtn, this.jumpBtn, this.closeBtn].forEach(btn => {
      btn.x = startX; btn.y = y;
      btn.width = this.buttonW; btn.height = this.buttonH;
      y += this.buttonH + this.padY;
    });
  }

  private recomputeNavMap(): void {
    this.nav.clearNavMap();
    const nodes: any[] = [];

    const maybePush = (btn: UIButton, row: number) => {
      if (btn.disabled) return;                 // NEW
      nodes.push({
        gridX: 0, gridY: row,
        screenX: btn.x + btn.width  / 2,
        screenY: btn.y + btn.height / 2,
        isEnabled: true,
      });
    };

    let row = 0;
    maybePush(this.tradePostBtn , row++);
    maybePush(this.contractsBtn , row++);
    maybePush(this.jumpBtn      , row++);
    maybePush(this.closeBtn     , row);

    this.nav.setNavMap(nodes);
  }

  private navNodeAt(btn: UIButton, row: number) {
    return {
      gridX: 0, gridY: row,
      screenX: btn.x + btn.width / 2,
      screenY: btn.y + btn.height / 2,
      isEnabled: true,
    };
  }
}
