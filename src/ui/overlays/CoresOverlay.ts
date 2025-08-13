// src/ui/overlays/CoresOverlay.ts

// Minimalist, reusable "Cores" HUD overlay.
// - Scale-aware (getUniformScaleFactor())
// - Chrome consistent with UIMinimalistWindow + UILabel
// - Zero external state: caller passes the current cores count.

import { getUniformScaleFactor } from '@/config/view';
import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel } from '@/ui/primitives/UILabel';
import { DEFAULT_CONFIG } from '@/config/ui';

export interface CoresOverlayOptions {
  /** Label prefix; defaults to "Cores" */
  labelPrefix?: string;

  /** Bottom-left anchoring margins (logical units; scaled internally) */
  marginLeft?: number;   // default 12
  marginBottom?: number; // default 12

  /** Internal padding and box sizing (logical units; scaled internally) */
  padX?: number;   // default 12
  padY?: number;   // default 8
  minWidth?: number; // default 148
  height?: number; // default 32

  /** Window chrome */
  alpha?: number;           // default 0.6
  borderRadiusScale?: number; // multiplier for DEFAULT_CONFIG.window.options.borderRadius (default 1)

  /** Typography */
  baseFontPx?: number; // logical font px; scaled by UI factor (default 12)
  fontFamily?: string; // default monospace
}

/**
 * Render the bottom-left "Cores" overlay into the provided 2D context.
 * GC-neutral (modulo string interpolation for the label).
 */
export function renderCoresOverlay(
  ctx: CanvasRenderingContext2D,
  cores: number,
  opts?: CoresOverlayOptions
): void {
  const ui = getUniformScaleFactor();

  // ---- Defaults (logical units; scaled ↓) ----
  const labelPrefix = opts?.labelPrefix ?? 'Cores';
  const CORE_PAD_X  = (opts?.padX ?? 12) * ui;
  const CORE_PAD_Y  = (opts?.padY ?? 8) * ui;
  const CORE_MIN_W  = (opts?.minWidth ?? 148) * ui;
  const CORE_H      = (opts?.height ?? 32) * ui;
  const CORE_MARGIN_L = (opts?.marginLeft ?? 12) * ui;
  const CORE_MARGIN_B = (opts?.marginBottom ?? 12) * ui;

  const alpha        = opts?.alpha ?? 0.6;
  const borderRadius = (DEFAULT_CONFIG.window.options.borderRadius * (opts?.borderRadiusScale ?? 1)) * ui;

  const baseFontPx   = (opts?.baseFontPx ?? 12);
  const fontPx       = Math.round(baseFontPx * ui);
  const fontFamily   = opts?.fontFamily ?? 'monospace';

  // ---- Compose label and measure ----
  const label = `${labelPrefix}: ${cores}`;

  ctx.save();
  ctx.font = `${fontPx}px ${fontFamily}`;
  // Note: measureText width returned in device px; we’re already scaled by ui.
  const textW = Math.ceil(ctx.measureText(label).width);
  ctx.restore();

  const winH = Math.round(CORE_H);
  const winW = Math.max(Math.round(CORE_MIN_W), textW + Math.round(CORE_PAD_X * 2));

  const x = Math.round(CORE_MARGIN_L);
  const y = ctx.canvas.height - winH - Math.round(CORE_MARGIN_B);

  // ---- Window ----
  drawMinimalistWindow(ctx, x, y, winW, winH, {
    alpha,
    borderRadius,
    borderColor: DEFAULT_CONFIG.window.options.borderColor,
  });

  // ---- Text ----
  const textX = x + Math.round(CORE_PAD_X);
  const textY = y + Math.round((winH - fontPx) / 2);
  drawLabel(
    ctx,
    textX,
    textY,
    label,
    {
      font: `${baseFontPx}px ${fontFamily}`, // drawLabel handles scaling via `ui`
      color: DEFAULT_CONFIG.general.textColor,
      align: 'left',
      glow: true,
    },
    ui
  );
}
