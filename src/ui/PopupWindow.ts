// src/ui/PopupWindow.ts
//
// Extremely simple, self-contained popup window with two behaviors:
// 1) Delayed Close button (default): Close button and Esc/cancel become usable after 1.0s.
// 2) Timed auto-close (optional): If a timerSeconds is provided, the window hides automatically
//    after that duration and does not show a Close button.
//
// Open via:
//   GlobalEventBus.emit('popup:window:show', { title, content })                       // delayed button
//   GlobalEventBus.emit('popup:window:show', { title, content, timerSeconds: 3.5 })    // auto-close
//
// Or call openWith(title, content, timerSeconds?) directly.

import { CanvasManager } from '@/core/CanvasManager';
import { GlobalEventBus } from '@/core/EventBus';
import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton, type UIButton } from '@/ui/primitives/UIButton';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { getUniformScaleFactor } from '@/config/view';
import { DEFAULT_CONFIG } from '@/config/ui';
import { audioManager } from '@/audio/Audio';

import type { InputManager } from '@/core/InputManager';

type ShowPayload = {
  title: string;
  content: string;
  /** If provided, the popup will auto-close after this many seconds and no Close button will be shown. */
  timerSeconds?: number;
};

type Mode = 'delayedButton' | 'autoClose';

export class PopupWindow {
  // External deps
  private readonly input: InputManager;
  private readonly cm: CanvasManager = CanvasManager.getInstance();
  private readonly ctx: CanvasRenderingContext2D = this.cm.getContext('overlay');

  // State
  private open = false;
  private title = 'Notice';
  private content = '';

  // Behavior mode
  private mode: Mode = 'delayedButton';

  // Delayed button gate (seconds)
  private readonly revealDelay = 1.0;
  private revealElapsed = 0.0;

  // Auto-close timer (seconds)
  private autoCloseSeconds: number | null = null;
  private autoElapsed = 0.0;

  // Layout (computed in resize())
  private winX = 0;
  private winY = 0;
  private winW = 420;
  private winH = 220;
  private pad = 16;

  // UI
  private closeBtn: UIButton;

  // Bound handlers
  private readonly onShow = ({ title, content, timerSeconds }: ShowPayload) =>
    this.openWith(title, content, timerSeconds);
  private readonly onHide = () => this.close();

  constructor(input: InputManager) {
    this.input = input;

    // Close button
    const scale = getUniformScaleFactor();
    this.closeBtn = {
      x: 0, y: 0,
      width: 160 * scale,
      height: 44 * scale,
      label: 'Close',
      onClick: () => this.close(),
      isHovered: false,
      wasHovered: false,
      style: {
        ...DEFAULT_CONFIG.button.style,
        textFont: `${14 * scale}px monospace`,
      },
    };

    // Event wiring
    GlobalEventBus.on('popup:window:show', this.onShow);
    GlobalEventBus.on('popup:window:hide', this.onHide);

    // Initial layout
    this.resize();
  }

  // ──────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────
  public openWith(title: string, content: string, timerSeconds?: number) {
    this.title = title ?? 'Notice';
    this.content = content ?? '';
    this.open = true;

    // Configure mode
    if (typeof timerSeconds === 'number' && isFinite(timerSeconds) && timerSeconds > 0) {
      this.mode = 'autoClose';
      this.autoCloseSeconds = timerSeconds;
      this.autoElapsed = 0.0;
    } else {
      this.mode = 'delayedButton';
      this.autoCloseSeconds = null;
      this.autoElapsed = 0.0;
      this.revealElapsed = 0.0; // reset the delay gate
    }

    this.resize();
    audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx', { maxSimultaneous: 4 });
  }

  public isOpen(): boolean { return this.open; }

  public close(): void {
    if (!this.open) return;
    this.open = false;
    audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 4 });
  }

  public destroy(): void {
    GlobalEventBus.off('popup:window:show', this.onShow);
    GlobalEventBus.off('popup:window:hide', this.onHide);
  }

  // ──────────────────────────────────────────────────────────
  // Layout
  // ──────────────────────────────────────────────────────────
  public resize(): void {
    const scale = getUniformScaleFactor();
    const overlay = this.cm.getCanvas('overlay');
    const vpW = overlay.width;
    const vpH = overlay.height;

    // Window dimensions: modest, responsive
    this.winW = Math.min(560 * scale, Math.max(360 * scale, vpW * 0.45));
    this.winH = Math.min(360 * scale, Math.max(200 * scale, vpH * 0.28));
    this.pad = 16 * scale;

    this.winX = (vpW - this.winW) / 2;
    // Slight vertical bias downward to sit in “visual focal plane”
    this.winY = (vpH - this.winH) / 2 + (20 * scale);

    // Button sizing
    this.closeBtn.width = Math.max(140 * scale, Math.min(220 * scale, this.winW * 0.4));
    this.closeBtn.height = 44 * scale;

    // Button placement (bottom-center inside window)
    this.closeBtn.x = this.winX + (this.winW - this.closeBtn.width) / 2;
    this.closeBtn.y = this.winY + this.winH - this.closeBtn.height - this.pad;
  }

  // ──────────────────────────────────────────────────────────
  // Update & Render
  // ──────────────────────────────────────────────────────────
  public update(dt: number): void {
    if (!this.open) return;

    if (this.mode === 'autoClose') {
      // No interactions; simply wait and close.
      this.autoElapsed += dt;
      if (this.autoCloseSeconds !== null && this.autoElapsed >= this.autoCloseSeconds) {
        this.close();
      }
      return;
    }

    // Delayed-button mode
    if (this.revealElapsed < this.revealDelay) {
      this.revealElapsed += dt;
      if (this.revealElapsed < this.revealDelay) {
        this.closeBtn.isHovered = false;
        return; // still locked
      }
      // Just unlocked: subtle tick
      audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 4 });
    }

    const mouse = this.input.getMousePosition();
    const clicked = this.input.wasMouseClicked();

    // Hover detection (only after delay)
    if (mouse) {
      const { x: mx, y: my } = mouse;
      const r = { x: this.closeBtn.x, y: this.closeBtn.y, width: this.closeBtn.width, height: this.closeBtn.height };
      this.closeBtn.isHovered = isMouseOverRect(mx, my, r, 1.0);
    } else {
      this.closeBtn.isHovered = false;
    }

    // Click to close (only after delay)
    if (clicked && this.closeBtn.isHovered) {
      this.closeBtn.onClick();
      return;
    }

    // Keyboard escape/cancel (only after delay)
    if (this.input.wasActionJustPressed?.('cancel') || this.input.wasKeyJustPressed?.('Escape')) {
      this.close();
      return;
    }
  }

  public render(): void {
    if (!this.open) return;

    const ctx = this.ctx;
    const scale = getUniformScaleFactor();

    // Window chrome
    drawMinimalistWindow(ctx, this.winX, this.winY, this.winW, this.winH, {
      ...DEFAULT_CONFIG.window.options,
      alpha: 0.88,
      borderRadiusScale: scale,
    });

    // Title
    drawLabel(
      ctx,
      this.winX + this.winW / 2,
      this.winY + (14 * scale),
      this.title,
      {
        font: `${16 * scale}px monospace`,
        align: 'center',
        glow: true,
      }
    );

    // Content (wrapped)
    const contentFontPx = 13 * scale;
    const contentAreaX = this.winX + (this.winW / 2);
    const contentAreaY = this.winY + (60 * scale);
    const contentAreaW = this.winW - this.pad * 2;
    const lineHeight = 18 * scale;

    const lines = this.wrapTextToWidth(this.content, contentAreaW, `${contentFontPx}px monospace`);
    let y = contentAreaY;

    for (let i = 0; i < lines.length; i++) {
      drawLabel(ctx, contentAreaX, y, lines[i], {
        font: `${contentFontPx}px monospace`,
        align: 'center',
        glow: false,
      });
      y += lineHeight;
      if (y > this.closeBtn.y - (10 * scale)) break;
    }

    // Draw the Close button only in delayed-button mode and only after delay
    if (this.mode === 'delayedButton' && this.revealElapsed >= this.revealDelay) {
      drawButton(ctx, this.closeBtn, 1, 14 * scale, 2 * scale);
    }
  }

  // ──────────────────────────────────────────────────────────
  // Text Wrapping (minimalist, space-aware; no hyphenation)
  // ──────────────────────────────────────────────────────────
  private wrapTextToWidth(text: string, maxWidth: number, font: string): string[] {
    const ctx = this.ctx;
    const saved = ctx.font;
    ctx.font = font;

    const words = (text ?? '').split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';

    for (const w of words) {
      const tryLine = line ? `${line} ${w}` : w;
      if (ctx.measureText(tryLine).width <= maxWidth) {
        line = tryLine;
      } else {
        if (line) lines.push(line);
        // If a single word is longer than maxWidth, hard-slice to avoid infinite loop.
        if (ctx.measureText(w).width > maxWidth) {
          lines.push(...this.bruteforceSliceWord(w, maxWidth, ctx));
          line = '';
        } else {
          line = w;
        }
      }
    }
    if (line) lines.push(line);

    ctx.font = saved;
    return lines.length ? lines : [''];
  }

  private bruteforceSliceWord(word: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[] {
    const chars = [...word];
    const out: string[] = [];
    let buf = '';

    for (const ch of chars) {
      const tryBuf = buf + ch;
      if (ctx.measureText(tryBuf).width <= maxWidth) {
        buf = tryBuf;
      } else {
        if (buf) out.push(buf);
        buf = ch;
      }
    }
    if (buf) out.push(buf);
    return out;
  }
}
