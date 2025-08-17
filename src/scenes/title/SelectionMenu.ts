// src/scenes/title/SelectionMenu.ts

import { DEFAULT_CONFIG, NEON_CYAN_CONFIG, SOLAR_FLARE_CONFIG, SYNTH_WAVE_CONFIG } from '@/config/ui';
import { PlayerMetaCurrencyManager } from '@/game/player/PlayerMetaCurrencyManager';
import { CanvasManager } from '@/core/CanvasManager';
import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { getUniformScaleFactor } from '@/config/view';
import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';
import { audioManager } from '@/audio/Audio';

import { PopupWindow } from '@/ui/PopupWindow';
import { displayPopupWindowMessage } from '@/core/interfaces/events/PopupWindowReporter';

import { 
  launchGameFromSelectionMenu, 
  openCollectionFromSelectionMenu, 
  openPassiveSkillsFromSelectionMenu, 
  quitFromSelectionMenu,
 } from '@/core/interfaces/events/GameSelectionMenuReporter';

import { renderCoresOverlay } from '@/ui/overlays/CoresOverlay';

import type { InputManager } from '@/core/InputManager';

const styleOf = (btn: UIButton) => (btn.style ??= {});

export class SelectionMenu {
  // Dependencies
  private readonly input: InputManager;
  private readonly nav: GamepadMenuInteractionManager;
  private readonly cm: CanvasManager;
  private readonly ctx: CanvasRenderingContext2D;

  private popupWindow: PopupWindow;

  // State
  private open = false;
  private lastHoveredBtn: UIButton | null = null;

  // Layout
  private winX = 0; private winY = 0;
  private winW = 360; private winH = 220;
  private buttonW = 220; private buttonH = 64;
  private padY = 20;

  // Opening Lock
  private isLocked = true;
  private lockTimer = 0.25;

  // UI Buttons
  private readonly launchMissionBtn: UIButton;
  private readonly passiveSkillsBtn: UIButton;
  private readonly unlocksBtn: UIButton;
  private readonly quitBtn: UIButton;
  private hoverPulseTimer: number = 0;

  constructor(input: InputManager, nav: GamepadMenuInteractionManager) {
    this.input = input;
    this.cm = CanvasManager.getInstance();
    this.ctx = this.cm.getContext('overlay');
    this.nav = nav
    this.popupWindow = new PopupWindow(input);

    this.launchMissionBtn = this.makeButton('Launch Mission', () => {
      audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx', { maxSimultaneous: 4 });
      launchGameFromSelectionMenu();
    }, NEON_CYAN_CONFIG.button.style);

    this.passiveSkillsBtn = this.makeButton('Passive Skills', () => {
      audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx', { maxSimultaneous: 4 });
      openPassiveSkillsFromSelectionMenu();
    }, SOLAR_FLARE_CONFIG.button.style);

    this.unlocksBtn = this.makeButton('Astral Codex', () => {
      audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx', { maxSimultaneous: 4 });
      // openCollectionFromSelectionMenu();
      // Display popup window message that it is not available in demo
      this.popupWindow.openWith('Coming Soon', 'This feature is not available in the demo.', 2.0);
    }, SYNTH_WAVE_CONFIG.button.style);

    this.quitBtn = this.makeButton('Logout', () => {
      audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx', { maxSimultaneous: 4 });
      quitFromSelectionMenu();
    });
  }

  openMenu(): void {
    this.open = true;
    this.lastHoveredBtn = null;
    this.hoverPulseTimer = 0;
    this.resize();
    this.recomputeNavMap();
    audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx');
  }

  isOpen(): boolean { return this.open; }

  closeMenu(): void {
    if (!this.open) return;
    this.open = false;
    this.nav.clearNavMap();
  }

  update(dt: number): void {
    this.popupWindow.update(dt);

    if (!this.open || this.popupWindow.isOpen()) return;

    if (this.isLocked) {
      this.lockTimer -= dt;
      if (this.lockTimer <= 0) {
        this.isLocked = false;
        this.lockTimer = 1.0;
      }
      return;
    }

    this.hoverPulseTimer += dt;

    const mouse = this.input.getMousePosition();
    const clicked = this.input.wasMouseClicked();
    const { x: mx, y: my } = mouse ?? { x: -1, y: -1 };

    this.nav.update();

    const buttons = [
      this.launchMissionBtn,
      this.passiveSkillsBtn,
      this.unlocksBtn,
      this.quitBtn,
    ];

    if (this.isLocked) return;

    buttons.forEach(btn => {
      if (btn.disabled) return;

      const r = { x: btn.x, y: btn.y, width: btn.width, height: btn.height };
      btn.isHovered = isMouseOverRect(mx, my, r, 1.0);

      if (btn.isHovered) {
        const pulseAlpha = 0.12 + 0.12 * Math.sin(this.hoverPulseTimer * 6);
        styleOf(btn).backgroundAlpha = pulseAlpha;
      } else {
        styleOf(btn).backgroundAlpha = undefined;
      }

      if (btn.isHovered && btn !== this.lastHoveredBtn) {
        audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 4 });
        this.lastHoveredBtn = btn;
        this.hoverPulseTimer = 0;
      }

      if (clicked && btn.isHovered) {
        btn.onClick();
      }
    });

    if (!buttons.some(b => b.isHovered)) {
      this.lastHoveredBtn = null;
    }

    if (this.input.wasActionJustPressed('cancel') || this.input.wasKeyJustPressed('Escape')) {
      this.closeMenu();
    }
  }

  render(): void {
    this.popupWindow.render();
    if (!this.open || this.popupWindow.isOpen()) return;

    const scale = getUniformScaleFactor();
    const ctx = this.ctx;

    renderCoresOverlay(ctx, PlayerMetaCurrencyManager.getInstance().getMetaCurrency());

    drawMinimalistWindow(ctx, this.winX, this.winY, this.winW, this.winH, {
      ...DEFAULT_CONFIG.window.options,
      alpha: 0.5,
      borderRadiusScale: scale,
    });

    drawButton(ctx, this.launchMissionBtn, 1, 18 * scale, scale * 2);
    drawButton(ctx, this.passiveSkillsBtn, 1, 18 * scale, scale * 2);
    drawButton(ctx, this.unlocksBtn, 1, 18 * scale, scale * 2);
    drawButton(ctx, this.quitBtn, 1, 18 * scale, scale * 2);
  }

  private makeButton(
    label: string,
    onClick: () => void,
    styleOverride?: Partial<UIButton['style']>
  ): UIButton {
    return {
      x: 0, y: 0,
      width: this.buttonW, height: this.buttonH,
      label, onClick,
      isHovered: false, wasHovered: false,
      style: {
        ...DEFAULT_CONFIG.button.style,
        ...(styleOverride ?? {}),
        textFont: `${15 * getUniformScaleFactor()}px monospace`,
      },
    };
  }

  private resize(): void {
    const scale = getUniformScaleFactor();
    const vpW = this.cm.getCanvas('overlay').width;
    const vpH = this.cm.getCanvas('overlay').height;

    this.winW = 320 * scale;
    this.winH = 380 * scale; // Extended height to accommodate 4 buttons
    this.winX = (vpW - this.winW) / 2;
    this.winY = (vpH - this.winH) / 2 + 40 * scale;

    this.buttonW = 280 * scale;
    this.buttonH = 66 * scale;
    this.padY = 20 * scale;

    const startX = this.winX + (this.winW - this.buttonW) / 2;
    let y = this.winY + 28 * scale;

    [
      this.launchMissionBtn,
      this.passiveSkillsBtn,
      this.unlocksBtn,
      this.quitBtn,
    ].forEach(btn => {
      btn.x = startX;
      btn.y = y;
      btn.width = this.buttonW;
      btn.height = this.buttonH;
      y += this.buttonH + this.padY;
    });
  }

  private recomputeNavMap(): void {
    this.nav.clearNavMap();
    const nodes: any[] = [];

    const maybePush = (btn: UIButton, row: number) => {
      if (btn.disabled) return;
      nodes.push({
        gridX: 0, gridY: row,
        screenX: btn.x + btn.width / 2,
        screenY: btn.y + btn.height / 2,
        isEnabled: true,
      });
    };

    let row = 0;
    maybePush(this.launchMissionBtn, row++);
    maybePush(this.passiveSkillsBtn, row++);
    maybePush(this.unlocksBtn, row++);
    maybePush(this.quitBtn, row);

    this.nav.setNavMap(nodes);
  }
}
