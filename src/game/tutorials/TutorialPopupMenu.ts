// src/game/tutorials/TutorialPopupMenu.ts
//
// Modal, paginated tutorial popup.
// - Minimalist window chrome
// - Dominant image area (rendered via drawUIImageBox; implemented separately)
// - Page indicator "i / N" above image
// - Prev/Next arrow buttons, vertically centered beside the image
// - Footer with "Disable Tutorials [ ]" checkbox and Close button
//
// Design notes:
// • Logical geometry → scaled at render/layout only (getUniformScaleFactor()).
// • GC-neutral: controls are allocated once; only numeric fields mutate.
// • Gamepad support via GamepadMenuInteractionManager (nav map built on open & index changes).
// • Lazy image preloading with a small in-memory cache (by imagePath).
//

import { CanvasManager } from '@/core/CanvasManager';
import type { InputManager } from '@/core/InputManager';
import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';

import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { drawButton, type UIButton } from '@/ui/primitives/UIButton';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawCheckbox, type UICheckbox } from '@/ui/primitives/UICheckBox';
import { drawUIImageBox } from '@/ui/primitives/UIImageBox';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';

import { getUniformScaleFactor } from '@/config/view';
import { DEFAULT_CONFIG } from '@/config/ui';

import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';
import { pauseRuntime, resumeRuntime } from '@/core/interfaces/events/RuntimeReporter';
import { audioManager } from '@/audio/Audio';

import type { TutorialSlide } from '@/game/tutorials/interfaces/TutorialSlide';

interface OpenOptions {
  title?: string;
  initialDisableFlag?: boolean;
  onToggleDisable?: (disabled: boolean) => void;
  onClose?: (finalIndex: number, disabled: boolean) => void;
}

const WINDOW_W = 640;     // logical units
const WINDOW_H = 480;     // logical units
const PAD = 16;
const TITLE_H = 24;
const FOOTER_H = 48;
const GAP = 10;

const ARROW_W = 44;
const ARROW_H = 60;

const CHECKBOX_SIZE = 14; // logical checkbox square
const CHECKBOX_LABEL = 'Disable Tutorials';

const HOVER_SFX = 'assets/sounds/sfx/ui/hover_00.wav';
const ACTIVATE_SFX = 'assets/sounds/sfx/ui/activate_00.wav';
const CLICK_SFX = 'assets/sounds/sfx/ui/sub_00.wav';
const ERROR_SFX = 'assets/sounds/sfx/ui/error_00.wav';

export class TutorialPopupMenu {
  // ────────────────────────── deps
  private readonly input: InputManager;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly nav: GamepadMenuInteractionManager;

  // ────────────────────────── state
  private openFlag = false;
  private slides: TutorialSlide[] = [];
  private idx = 0;

  private title = 'Tutorial';
  private disableTutorials = false;
  private onToggleDisable: ((disabled: boolean) => void) | null = null;
  private onCloseCb: ((finalIndex: number, disabled: boolean) => void) | null = null;

  // hover/FX state (no allocations)
  private hoverPulseT = 0;
  private lastHovered: UIButton | null = null;

  // small image cache (path → HTMLImageElement)
  private readonly imgCache = new Map<string, HTMLImageElement>();
  private readonly imgLoading = new Set<string>();

  // ────────────────────────── geometry (screen px, computed per-frame)
  private winX = 0; private winY = 0; private winW = 0; private winH = 0;
  private imgX = 0; private imgY = 0; private imgW = 0; private imgH = 0;

  // ────────────────────────── controls (allocated once)
  private readonly btnPrev: UIButton;
  private readonly btnNext: UIButton;
  private readonly btnClose: UIButton;
  private readonly checkbox: UICheckbox;

  // avoid rebuilding nav map every frame
  private navDirty = false;

  constructor(input: InputManager) {
    this.input = input;
    const cm = CanvasManager.getInstance();
    this.ctx = cm.getContext('overlay');
    this.nav = new GamepadMenuInteractionManager(this.input);

    // Buttons (logical geometry; x/y/width/height are assigned during render())
    const ui = getUniformScaleFactor();
    this.btnPrev = {
      x: 0, y: 0, width: ARROW_W, height: ARROW_H,
      label: '◀',
      onClick: () => this.prev(),
      isHovered: false, wasHovered: false, disabled: false,
      style: {
        ...DEFAULT_CONFIG.button.style,
        textFont: `${14 * ui}px monospace`,
        borderRadius: 4 * ui,
      },
    };

    this.btnNext = {
      x: 0, y: 0, width: ARROW_W, height: ARROW_H,
      label: '▶',
      onClick: () => this.next(),
      isHovered: false, wasHovered: false, disabled: false,
      style: {
        ...DEFAULT_CONFIG.button.style,
        textFont: `${14 * ui}px monospace`,
        borderRadius: 4 * ui,
      },
    };

    this.btnClose = {
      x: 0, y: 0, width: 160, height: 44,
      label: 'Close',
      onClick: () => this.close(),
      isHovered: false, wasHovered: false, disabled: false,
      style: {
        ...DEFAULT_CONFIG.button.style,
        textFont: `${13 * ui}px monospace`,
      },
    };

    this.checkbox = {
      x: 0, y: 0, size: CHECKBOX_SIZE,
      label: CHECKBOX_LABEL,
      checked: false,
      isHovered: false,
      onToggle: (v: boolean) => {
        this.disableTutorials = v;
        if (this.onToggleDisable) this.onToggleDisable(v);
      },
      style: {
        // Subtle theme-consistent colors; uses defaults if omitted
        boxColor: '#181C22',
        checkColor: '#41E6A3',
        hoverColor: '#263141',
        labelColor: DEFAULT_CONFIG.general.infoTextColor,
        borderColor: '#2E6B6B',
        font: '12px monospace',
      },
    };
  }

  // ══════════════════════════════════════════ Public API ══════════════════════════════════════════

  open(slides: TutorialSlide[], startIndex = 0, opts?: OpenOptions): void {
    if (!slides || slides.length === 0) {
      console.warn('[TutorialPopupMenu] No slides were provided; refusing to open.');
      return;
    }

    this.slides = slides;
    this.idx = this.clamp(startIndex | 0, 0, this.slides.length - 1);

    this.title = opts?.title ?? 'Tutorial';
    this.disableTutorials = !!opts?.initialDisableFlag;
    this.checkbox.checked = this.disableTutorials;

    this.onToggleDisable = opts?.onToggleDisable ?? null;
    this.onCloseCb = opts?.onClose ?? null;

    // Begin modal
    pauseRuntime();
    GlobalMenuReporter.getInstance().setMenuOpen('tutorialPopup');
    audioManager.play(ACTIVATE_SFX, 'sfx');

    this.openFlag = true;
    this.navDirty = true;

    // Prime image cache for current + neighbors
    this.preloadAround(this.idx);
  }

  close(): void {
    if (!this.openFlag) return;
    this.openFlag = false;
    this.nav.clearNavMap();

    resumeRuntime();
    GlobalMenuReporter.getInstance().setMenuClosed('tutorialPopup');

    if (this.onCloseCb) {
      this.onCloseCb(this.idx, this.disableTutorials);
    }
  }

  isOpen(): boolean {
    return this.openFlag;
  }

  next(): void {
    if (this.idx >= this.slides.length - 1) {
      audioManager.play(ERROR_SFX, 'sfx', { maxSimultaneous: 4 });
      return;
    }
    this.idx++;
    this.navDirty = true;
    this.preloadAround(this.idx);
    audioManager.play(CLICK_SFX, 'sfx', { maxSimultaneous: 6 });
  }

  prev(): void {
    if (this.idx <= 0) {
      audioManager.play(ERROR_SFX, 'sfx', { maxSimultaneous: 4 });
      return;
    }
    this.idx--;
    this.navDirty = true;
    this.preloadAround(this.idx);
    audioManager.play(CLICK_SFX, 'sfx', { maxSimultaneous: 6 });
  }

  // ══════════════════════════════════════════ Frame lifecycle ═════════════════════════════════════

  update(dt: number): void {
    if (!this.openFlag) return;

    const ui = getUniformScaleFactor();
    this.hoverPulseT += dt;

    // Virtual cursor / nav manager
    this.nav.update();

    // Keyboard/gamepad convenience actions
    if (this.input.wasActionJustPressed('cancel') || this.input.wasKeyJustPressed('Escape')) {
      this.close();
      return;
    }
    if (this.input.wasKeyJustPressed('ArrowLeft')) this.prev();
    if (this.input.wasKeyJustPressed('ArrowRight')) this.next();

    // Hover + click handling
    const mouse = this.input.getMousePosition();
    const clicked = this.input.wasMouseClicked();
    const mx = mouse?.x ?? -1;
    const my = mouse?.y ?? -1;

    // Update button disabled states for edges
    this.btnPrev.disabled = (this.idx === 0);
    this.btnNext.disabled = (this.idx === this.slides.length - 1);

    // Hover checks
    this.applyHover(this.btnPrev, mx, my);
    this.applyHover(this.btnNext, mx, my);
    this.applyHover(this.btnClose, mx, my);

    // Checkbox hover (hit box includes label width)
    this.checkbox.isHovered = this.hitTestCheckbox(mx, my, ui);

    // Clicks
    if (clicked) {
      if (this.btnPrev.isHovered && !this.btnPrev.disabled) this.btnPrev.onClick();
      if (this.btnNext.isHovered && !this.btnNext.disabled) this.btnNext.onClick();
      if (this.btnClose.isHovered && !this.btnClose.disabled) this.btnClose.onClick();

      if (this.checkbox.isHovered) {
        // Toggle and fire hook
        const newVal = !this.disableTutorials;
        this.checkbox.onToggle(newVal);
        audioManager.play(CLICK_SFX, 'sfx', { maxSimultaneous: 6 });
      }
    }
  }

  render(): void {
    if (!this.openFlag) return;

    const ui = getUniformScaleFactor();
    const ctx = this.ctx;
    const canvas = ctx.canvas;

    // ────────── Window geometry (screen px)
    this.winW = Math.min(Math.round(WINDOW_W * ui), canvas.width - Math.round(PAD * ui) * 2);
    this.winH = Math.min(Math.round(WINDOW_H * ui), canvas.height - Math.round(PAD * ui) * 2);
    this.winX = Math.round((canvas.width - this.winW) / 2);
    this.winY = Math.round((canvas.height - this.winH) / 2);

    // Image rect (dominant area)
    const padPx = Math.round(PAD * ui);
    const titleH = Math.round(TITLE_H * ui);
    const footerH = Math.round(FOOTER_H * ui);
    const gapPx = Math.round(GAP * ui);

    this.imgX = this.winX + padPx;
    this.imgY = this.winY + padPx + titleH;
    this.imgW = this.winW - padPx * 2;
    this.imgH = this.winH - (padPx * 2 + titleH + footerH + gapPx);

    // Arrow buttons (centered vertically on image rect)
    const arrowW = Math.round(ARROW_W * ui);
    const arrowH = Math.round(ARROW_H * ui);
    this.btnPrev.x = this.imgX - (arrowW + Math.round(8 * ui));
    this.btnPrev.y = this.imgY + Math.round((this.imgH - arrowH) / 2);
    this.btnPrev.width = arrowW;
    this.btnPrev.height = arrowH;

    this.btnNext.x = this.imgX + this.imgW + Math.round(8 * ui);
    this.btnNext.y = this.btnPrev.y;
    this.btnNext.width = arrowW;
    this.btnNext.height = arrowH;

    // Footer row: checkbox (left), close (right)
    const footerY = this.winY + this.winH - footerH;
    this.checkbox.x = this.winX + padPx;
    this.checkbox.y = footerY + Math.round((footerH - Math.round((CHECKBOX_SIZE + 6) * ui)) / 2);
    // checkbox.size is logical; drawCheckbox will scale by ui

    const closeW = Math.round(160 * ui), closeH = Math.round(44 * ui);
    this.btnClose.width = closeW; this.btnClose.height = closeH;
    this.btnClose.x = this.winX + this.winW - padPx - closeW;
    this.btnClose.y = footerY + Math.round((footerH - closeH) / 2);

    // Nav map rebuild if needed (positions are now valid)
    if (this.navDirty) {
      this.recomputeNavMap();
      this.navDirty = false;
    }

    // ────────── Chrome
    drawMinimalistWindow(ctx, this.winX, this.winY, this.winW, this.winH, {
      alpha: 0.66,
      borderRadius: DEFAULT_CONFIG.window.options.borderRadius * ui,
      borderColor: DEFAULT_CONFIG.window.options.borderColor,
    });

    // Title + Page indicator (above image)
    const titleY = this.winY + Math.round(8 * ui);
    drawLabel(ctx, this.winX + Math.round(this.winW / 2), titleY, this.title, {
      font: '14px monospace',
      align: 'center',
      glow: true,
      color: DEFAULT_CONFIG.general.textColor,
    }, ui);

    const indicator = `${this.idx + 1}/${this.slides.length}`;
    drawLabel(ctx, this.winX + this.winW - padPx, titleY, indicator, {
      font: '12px monospace',
      align: 'right',
      color: DEFAULT_CONFIG.general.infoTextColor,
      glow: false,
    }, ui);

    // ────────── Image box
    const slide = this.slides[this.idx];
    const img = this.imgCache.get(slide.imagePath) ?? null;

    drawUIImageBox(
      ctx,
      this.imgX, this.imgY, this.imgW, this.imgH,
      img,
      {
        alpha: 0.95,
        borderRadius: Math.max(4, Math.round(DEFAULT_CONFIG.window.options.borderRadius * 0.75 * ui)),
        letterboxFill: 'rgba(10,14,18,0.75)',
        borderColor: 'rgba(90,120,160,0.35)',
        borderWidth: Math.max(1, Math.round(1 * ui)),
      }
    );

    // Optional caption (single line, centered under image region, clipped if long)
    if (slide.caption) {
      const captionY = this.imgY + this.imgH + Math.round(6 * ui);
      // drawLabel does not ellipsize; we keep it to one line and rely on clip to window bounds.
      drawLabel(ctx, this.winX + Math.round(this.winW / 2), captionY, slide.caption, {
        font: '12px monospace',
        align: 'center',
        color: DEFAULT_CONFIG.general.infoTextColor,
        glow: false,
      }, ui);
    }

    // ────────── Controls
    drawButton(ctx, this.btnPrev, 1, 13, ui);
    drawButton(ctx, this.btnNext, 1, 13, ui);

    // Footer: checkbox + close
    drawCheckbox(ctx, this.checkbox, ui);
    drawButton(ctx, this.btnClose, 1, 13, ui);
  }

  // ══════════════════════════════════════════ Internals ═══════════════════════════════════════════

  private clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }

  private preloadAround(index: number): void {
    // current
    this.preload(this.slides[index].imagePath);
    // neighbors
    if (index - 1 >= 0) this.preload(this.slides[index - 1].imagePath);
    if (index + 1 < this.slides.length) this.preload(this.slides[index + 1].imagePath);
  }

  private preload(path: string): void {
    if (this.imgCache.has(path) || this.imgLoading.has(path)) return;

    const img = new Image();
    this.imgLoading.add(path);

    img.onload = () => {
      this.imgCache.set(path, img);
      this.imgLoading.delete(path);
    };
    img.onerror = () => {
      // Leave it absent; drawUIImageBox will show placeholder.
      this.imgLoading.delete(path);
      console.warn('[TutorialPopupMenu] Failed to load tutorial image:', path);
    };

    // NOTE: getAssetPath should be used inside drawUIImageBox for canonical resolution;
    // here we set raw path to opportunistically warm the browser cache.
    img.src = path;
  }

  private applyHover(btn: UIButton, mx: number, my: number): void {
    const hovered = isMouseOverRect(mx, my, {
      x: btn.x, y: btn.y, width: btn.width, height: btn.height,
    }, 1.0);

    btn.isHovered = hovered && !btn.disabled;

    // Decorative hover pulse only when active
    const style = (btn.style ??= {});
    if (btn.isHovered) {
      const t = this.hoverPulseT;
      style.backgroundAlpha = 0.10 + 0.10 * Math.sin(t * 6);
    } else {
      style.backgroundAlpha = undefined;
    }

    if (btn.isHovered && this.lastHovered !== btn) {
      audioManager.play(HOVER_SFX, 'sfx', { maxSimultaneous: 6 });
      this.lastHovered = btn;
      this.hoverPulseT = 0;
    }
    if (!btn.isHovered && this.lastHovered === btn) {
      this.lastHovered = null;
    }
  }

  private hitTestCheckbox(mx: number, my: number, ui: number): boolean {
    // Hit region = [box] + [label text width + padding]
    const scaledSize = this.checkbox.size * ui;
    const padX = Math.round(8 * ui);

    // Measure label width with scaled font
    const prevFont = this.ctx.font;
    const scaledFont = (this.checkbox.style?.font ?? '12px monospace')
      .replace(/(\d+)(px)/, (_, sz, unit) => `${Math.round(parseInt(sz, 10) * ui)}${unit}`);
    this.ctx.font = scaledFont;
    const labelWidth = this.checkbox.label ? this.ctx.measureText(this.checkbox.label).width : 0;
    this.ctx.font = prevFont;

    const rect = {
      x: this.checkbox.x,
      y: this.checkbox.y,
      width: scaledSize + padX + Math.round(labelWidth),
      height: scaledSize,
    };
    return isMouseOverRect(mx, my, rect, 1.0);
  }

  private recomputeNavMap(): void {
    // 4 focusables in a single row: Prev, Checkbox, Close, Next
    const center = (b: UIButton) => ({
      x: b.x + b.width / 2,
      y: b.y + b.height / 2,
    });
    const prevC = center(this.btnPrev);
    const nextC = center(this.btnNext);
    const closeC = center(this.btnClose);

    const checkboxCenter = {
      x: this.checkbox.x + (this.checkbox.size * getUniformScaleFactor()) / 2 + Math.round(40 * getUniformScaleFactor()),
      y: this.checkbox.y + (this.checkbox.size * getUniformScaleFactor()) / 2,
    };

    this.nav.clearNavMap();
    this.nav.setNavMap([
      { gridX: 0, gridY: 0, screenX: prevC.x,      screenY: prevC.y,      isEnabled: !this.btnPrev.disabled },
      { gridX: 1, gridY: 0, screenX: checkboxCenter.x, screenY: checkboxCenter.y, isEnabled: true },
      { gridX: 2, gridY: 0, screenX: closeC.x,     screenY: closeC.y,     isEnabled: true },
      { gridX: 3, gridY: 0, screenX: nextC.x,      screenY: nextC.y,      isEnabled: !this.btnNext.disabled },
    ]);
  }
}
