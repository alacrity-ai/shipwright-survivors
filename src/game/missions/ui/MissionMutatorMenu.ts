// src/game/missions/ui/MissionMutatorMenu.ts
//
// Right-side overlay for mission mutators (rendered during mission select).
// Two cyclers with left/right arrow buttons and a readout label.
// • Single-pass scaling (logical units × uiScale at render/layout only)
// • Right-anchored, vertically centered
// • Inline row labels with wider window
// • No gamepad/navmap; Escape closes

import { CanvasManager } from '@/core/CanvasManager';
import type { InputManager } from '@/core/InputManager';

import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { drawLabel } from '@/ui/primitives/UILabel';
import { getUniformScaleFactor } from '@/config/view';
import { DEFAULT_CONFIG } from '@/config/ui';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { audioManager } from '@/audio/Audio';

import { missionLoader } from '../MissionLoader';

type Trio = 'Normal' | 'High' | 'Catastrophic';
const styleOf = (btn: UIButton) => (btn.style ??= {});

// ──────────────────────────────────────────
// Progressive chroma for difficulty readouts
// (cool/teal → amber → magenta/red)
// ──────────────────────────────────────────
const SCHEMES: Record<Trio, { fill: string; border: string; text: string; alpha: number }> = {
  Normal: {
    fill  : '#08222A',   // deep teal
    border: '#23D9E2',   // cyan-teal
    text  : '#BFF7FF',   // pale aqua
    alpha : 0.55,
  },
  High: {
    fill  : '#2A1C08',   // warm brown/amber base
    border: '#FFB300',   // vivid amber
    text  : '#FFD68A',   // light amber
    alpha : 0.58,
  },
  Catastrophic: {
    fill  : '#2A0812',   // wine/magenta base
    border: '#FF3B6B',   // hot magenta/red
    text  : '#FFC0D0',   // light rose
    alpha : 0.60,
  },
};

export class MissionMutatorMenu {
  // ──────────────────────────────────────────
  // Deps
  // ──────────────────────────────────────────
  private readonly input: InputManager;
  private readonly cm = CanvasManager.getInstance();
  private readonly ctx = this.cm.getContext('overlay');

  // ──────────────────────────────────────────
  // State
  // ──────────────────────────────────────────
  private open = false;
  private hoverPulseT = 0;
  private lastHovered: UIButton | null = null;

  private readonly choices: Trio[] = ['Normal', 'High', 'Catastrophic'];
  private densityIdx = 0;
  private intensityIdx = 0;

  // ──────────────────────────────────────────
  // Layout (logical units; scale applied at render/layout only)
  // ──────────────────────────────────────────
  private readonly MARGIN_R = 16;   // right margin (to canvas edge)
  private readonly PAD_X = 16;
  private readonly PAD_Y = 16;

  // ⬇Wider window + label column so long labels don't crowd controls
  private readonly WINDOW_W = 420;  // was 360
  private readonly LABEL_W  = 220;  // reserved label column on the left

  private readonly TITLE_H = 24;
  private readonly ROW_H   = 48;
  private readonly ROW_GAP = 10;

  private readonly ARROW_W = 44;
  private readonly ARROW_H = 36;
  private readonly VALUE_W = 170;   // slightly wider center well

  // Computed (screen px after scaling)
  private winX = 0; private winY = 0;
  private winW = 0; private winH = 0;

  // ──────────────────────────────────────────
  // UI controls (store logical sizes; assign screen px per-frame)
  // ──────────────────────────────────────────
  private readonly densityLeft : UIButton;
  private readonly densityRight: UIButton;
  private readonly intensityLeft : UIButton;
  private readonly intensityRight: UIButton;

  constructor(input: InputManager) {
    this.input = input;

    this.densityLeft   = this.makeArrowBtn('◀', () => this.bumpDensity(-1));
    this.densityRight  = this.makeArrowBtn('▶', () => this.bumpDensity(+1));
    this.intensityLeft = this.makeArrowBtn('◀', () => this.bumpIntensity(-1));
    this.intensityRight= this.makeArrowBtn('▶', () => this.bumpIntensity(+1));

    // Set density and intensity to defaults when instantiated
    const store = missionLoader;
    store.setDensity('Normal');
    store.setIntensity('Normal');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════════════════

  openMenu(): void {
    if (this.open) return;
    this.open = true;
    this.hoverPulseT = 0;
    this.resize();
    audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx');
  }

  closeMenu(): void {
    if (!this.open) return;
    this.open = false;
  }

  isOpen(): boolean { return this.open; }

  getCurrentSettings(): { swarmDensity: Trio; swarmIntensity: Trio } {
    return {
      swarmDensity : this.choices[this.densityIdx],
      swarmIntensity: this.choices[this.intensityIdx],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Frame lifecycle
  // ═══════════════════════════════════════════════════════════════════════════

  update(dt: number): void {
    if (!this.open) return;

    this.hoverPulseT += dt;

    const pos = this.input.getMousePosition();
    const clicked = this.input.wasMouseClicked();
    const mx = pos?.x ?? -1;
    const my = pos?.y ?? -1;

    const buttons = [
      this.densityLeft, this.densityRight,
      this.intensityLeft, this.intensityRight,
    ];

    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      b.isHovered = isMouseOverRect(mx, my, { x: b.x, y: b.y, width: b.width, height: b.height }, 1.0);

      if (b.isHovered) {
        styleOf(b).backgroundAlpha = 0.12 + 0.12 * Math.sin(this.hoverPulseT * 6);
      } else {
        styleOf(b).backgroundAlpha = undefined;
      }

      if (b.isHovered && this.lastHovered !== b) {
        audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 4 });
        this.lastHovered = b;
        this.hoverPulseT = 0;
      }

      if (clicked && b.isHovered && !b.disabled) {
        b.onClick();
      }
    }

    if (!buttons.some(b => b.isHovered)) this.lastHovered = null;

    if (this.input.wasKeyJustPressed('Escape')) {
      this.closeMenu();
    }
  }

  render(): void {
    if (!this.open) return;

    const ctx = this.ctx;
    const ui = getUniformScaleFactor();
    const canvas = ctx.canvas;

    // Window geometry (screen px from logical)
    const logicalH = this.PAD_Y * 2 + this.TITLE_H + this.ROW_H * 2 + this.ROW_GAP;
    this.winW = Math.round(this.WINDOW_W * ui);
    this.winH = Math.round(logicalH * ui);
    this.winX = Math.round(canvas.width - this.winW - this.MARGIN_R * ui);
    this.winY = Math.round((canvas.height - this.winH) / 2 - (6 * ui));

    // Chrome
    drawMinimalistWindow(ctx, this.winX, this.winY, this.winW, this.winH, {
      alpha: 0.6,
      borderRadius: DEFAULT_CONFIG.window.options.borderRadius * ui,
      borderColor: DEFAULT_CONFIG.window.options.borderColor,
    });

    // Content origin (screen px)
    const contentX = this.winX + Math.round(this.PAD_X * ui);
    let cy = this.winY + Math.round(this.PAD_Y * ui);

    // Title
    drawLabel(ctx, contentX, cy, 'Mission Mutators', {
      font: '14px monospace',
      glow: true,
      color: DEFAULT_CONFIG.general.textColor,
    }, ui);
    cy += Math.round(this.TITLE_H * ui);

    // Row 1: Swarm Density (inline label)
    this.drawRow(
      ctx, ui, contentX, cy,
      'Swarm Density',
      this.choices[this.densityIdx],
      this.densityLeft, this.densityRight
    );
    cy += Math.round((this.ROW_H + this.ROW_GAP) * ui);

    // Row 2: Swarm Intensity (inline label)
    this.drawRow(
      ctx, ui, contentX, cy,
      'Swarm Intensity',
      this.choices[this.intensityIdx],
      this.intensityLeft, this.intensityRight
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Row renderer (inline label + right-aligned controls)
  // ═══════════════════════════════════════════════════════════════════════════

  private drawRow(
    ctx: CanvasRenderingContext2D,
    ui: number,
    x: number,
    y: number,
    label: string,
    value: Trio,
    leftBtn: UIButton,
    rightBtn: UIButton,
  ): void {
    const innerRight = this.winX + this.winW - Math.round(this.PAD_X * ui);
    const centerY = y + Math.round((this.ROW_H * ui) / 2);

    // ── Left label column (inline with controls)
    const labelX = x;
    const labelW = Math.round(this.LABEL_W * ui);
    const labelY = y + Math.round((this.ROW_H * ui - 12 * ui) / 2);

    drawLabel(ctx, labelX, labelY, label, {
      font: '12px monospace',
      color: DEFAULT_CONFIG.general.infoTextColor,
      align: 'left',
    }, ui);

    // ── Controls cluster anchored to the right
    const controlsTotalW = Math.round((this.ARROW_W + 8 + this.VALUE_W + 8 + this.ARROW_W) * ui);
    const controlsX = innerRight - controlsTotalW;

    // Assign button rects (screen px)
    leftBtn.x = controlsX;
    leftBtn.y = centerY - Math.round((this.ARROW_H * ui) / 2);
    leftBtn.width  = Math.round(this.ARROW_W * ui);
    leftBtn.height = Math.round(this.ARROW_H * ui);

    const valueX = leftBtn.x + leftBtn.width + Math.round(8 * ui);
    const valueW = Math.round(this.VALUE_W * ui);

    rightBtn.x = valueX + valueW + Math.round(8 * ui);
    rightBtn.y = leftBtn.y;
    rightBtn.width  = leftBtn.width;
    rightBtn.height = leftBtn.height;

    // === Difficulty-tinted value well ===
    const scheme = SCHEMES[value];

    drawMinimalistWindow(ctx, valueX, leftBtn.y, valueW, leftBtn.height, {
      borderColor: scheme.border,
      fillColor: scheme.fill,
      alpha: scheme.alpha,
      borderWidth: 1,
      borderRadius: DEFAULT_CONFIG.window.options.borderRadius * ui,
    });

    // Centered value (tinted text)
    drawLabel(ctx, valueX + Math.round(valueW / 2), centerY, value, {
      font: '13px monospace',
      align: 'center',
      color: scheme.text,
    }, ui);

    // Arrows
    drawButton(ctx, leftBtn, 1, 13, ui);
    drawButton(ctx, rightBtn, 1, 13, ui);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private makeArrowBtn(label: string, onClick: () => void): UIButton {
    // Store LOGICAL geometry; render() will assign scaled rects each frame.
    const scale = getUniformScaleFactor();
    return {
      x: 0, y: 0,
      width: this.ARROW_W,
      height: this.ARROW_H,
      label,
      onClick,
      isHovered: false,
      wasHovered: false,
      disabled: false,
      style: {
        ...DEFAULT_CONFIG.button.style,
        textFont: `${14 * scale}px monospace`, // logical → scaled at creation for your UIButton impl
        borderRadius: 4 * scale,
      },
    };
  }

  private bumpDensity(delta: number): void {
    this.densityIdx = this.modTri(this.densityIdx + delta);
    audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 4 });
    missionLoader.setDensity(this.choices[this.densityIdx]);
  }

  private bumpIntensity(delta: number): void {
    this.intensityIdx = this.modTri(this.intensityIdx + delta);
    audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 4 });
    missionLoader.setIntensity(this.choices[this.intensityIdx]);
  }

  private modTri(v: number): number {
    return (v % 3 + 3) % 3;
  }

  private resize(): void {
    // Window rect is recomputed in render() to follow dynamic canvas/scale changes.
  }
}
