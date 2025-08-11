// src/ui/primitives/UIButton.ts

import { DEFAULT_CONFIG } from '@/config/ui';

import { audioManager } from '@/audio/Audio';
import { brightenColor } from '@/shared/colorUtils';
import { getUniformScaleFactor } from '@/config/view';
import { GlobalEventBus } from '@/core/EventBus';

export interface UIButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  onHover?: () => void;
  isHovered?: boolean;
  wasHovered?: boolean;
  disabled?: boolean;

  style?: {
    borderRadius?: number;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    textFont?: string;
    alpha?: number;
    backgroundAlpha?: number;
    backgroundGradient?: {
      type: 'linear' | 'radial';
      stops: { offset: number; color: string }[];
      from?: [number, number];
      to?: [number, number];
      radius?: number;
    };
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Minimal color helpers (no new dependencies; GC-neutral primitives)
   -------------------------------------------------------------------------- */

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 255, g: 255, b: 255 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => {
    const s = Math.max(0, Math.min(255, v | 0)).toString(16);
    return s.length === 1 ? '0' + s : s;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  const k = clamp01(t);
  return rgbToHex(
    A.r + (B.r - A.r) * k,
    A.g + (B.g - A.g) * k,
    A.b + (B.b - A.b) * k
  );
}

function lighten(hex: string, t: number): string {
  return mix(hex, '#ffffff', clamp01(t));
}
function darken(hex: string, t: number): string {
  return mix(hex, '#000000', clamp01(t));
}

// Helper to generate rgba color strings, used in the original code.
function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}


/* ──────────────────────────────────────────────────────────────────────────
   Button Caching System
   - Caches rasterized buttons to offscreen canvases.
   - Keys are based on all visual properties (size, colors, label, etc.).
   - Alpha is NOT part of the key; it's applied during the final drawImage call.
   -------------------------------------------------------------------------- */

type CachedButtonVariants = {
    normal: HTMLCanvasElement;
    hovered: HTMLCanvasElement;
    disabled: HTMLCanvasElement;
};

const buttonCache = new Map<string, CachedButtonVariants>();
const MAX_GLOW_PADDING = 20; // Px. Provides space for the largest shadow/glow to avoid clipping.

/**
 * Generates a unique string key for a button based on its visual properties.
 * This key is used for caching the rendered button canvas.
 * @returns A unique string identifier.
 */
function getButtonCacheKey(
    button: UIButton,
    uiScale: number,
    fontSize: number,
    borderRadiusForcedScaling: number
): string {
    const { width, height, label, style = {} } = button;
    // Note: JSON.stringify is simple but effective for deep objects like gradients.
    // For extreme performance, a more specialized serializer could be used.
    return [
        `w:${width}`, `h:${height}`, `l:${label}`,
        `s:${uiScale.toFixed(2)}`, `fs:${fontSize}`, `brfs:${borderRadiusForcedScaling.toFixed(2)}`,
        `st-br:${style.borderRadius ?? 'def'}`,
        `st-bg:${style.backgroundColor ?? 'def'}`,
        `st-bc:${style.borderColor ?? 'def'}`,
        `st-tc:${style.textColor ?? 'def'}`,
        `st-tf:${style.textFont ?? 'def'}`,
        `st-grad:${style.backgroundGradient ? JSON.stringify(style.backgroundGradient) : 'null'}`
    ].join('|');
}


/**
 * The core rendering logic for a single button variant (e.g., normal, hovered).
 * This function draws the button onto a provided canvas context, offset by a padding amount.
 * It contains the original drawing logic, refactored to be stateless.
 */
function _renderButtonVariant(
  ctx: CanvasRenderingContext2D,
  button: UIButton,
  uiScale: number,
  fontSize: number,
  borderRadiusForcedScaling: number,
  variant: 'normal' | 'hovered' | 'disabled',
  glowPadding: number
): void {
  const { width, height, label, style = {} } = button;

  // Determine state based on the requested variant, ignoring the button's own state
  const isHovered = variant === 'hovered';
  const disabled = variant === 'disabled';

  const {
    textColor: defaultTextColor,
    accentColor,
    disabledColor,
    infoTextColor,
    backgroundColor: defaultBackgroundColor,
  } = DEFAULT_CONFIG.general;

  const {
    borderRadius = 6,
    backgroundColor = defaultBackgroundColor,
    borderColor = accentColor,
    textColor = defaultTextColor,
    textFont = `${fontSize}px monospace`,
    backgroundGradient,
    // Note: The button's main `alpha` and `backgroundAlpha` are handled by the caller.
    // This function renders the button as if it were fully opaque.
  } = style;

  const scaledW = width * uiScale;
  const scaledH = height * uiScale;

  const scaledRadius = borderRadius * uiScale * borderRadiusForcedScaling;
  const outerR = Math.min(scaledRadius, Math.min(scaledW, scaledH) * 0.5);

  const scaledFont = textFont.replace(
    /(\d+)(px)/,
    (_, size, unit) => `${Math.round(parseInt(size, 10) * uiScale)}${unit}`
  );

  // Effective properties are derived from the variant, not the button's dynamic state.
  const effectiveBorderColor = disabled ? darken(disabledColor, 0.1) : borderColor;
  const effectiveTextColor = disabled ? mix(infoTextColor, '#9aa4b2', 0.35) : textColor;

  const hoverBoost = disabled ? 0 : (isHovered ? 0.18 : 0.0);
  const glowBoost = disabled ? 0 : (isHovered ? 0.8 : 0.15);

  // Render at (glowPadding, glowPadding) to leave space for the glow.
  const x = glowPadding;
  const y = glowPadding;

  // ── Background fill (gradient default)
  let fillStyle: string | CanvasGradient;
  if (backgroundGradient) {
    const {
      type, stops,
      from = [x, y],
      to = [x + scaledW, y + scaledH],
      radius: gradRadius = Math.max(scaledW, scaledH)
    } = backgroundGradient;

    const grad = type === 'linear'
      ? ctx.createLinearGradient(from[0], from[1], to[0], to[1])
      : ctx.createRadialGradient(from[0], from[1], 0, from[0], from[1], gradRadius);

    for (let i = 0; i < stops.length; i++) {
      const c = disabled ? darken(stops[i].color, 0.35)
                         : brightenColor(stops[i].color, hoverBoost);
      grad.addColorStop(stops[i].offset, c);
    }
    fillStyle = grad;
  } else {
    const top = lighten(backgroundColor ?? '#141923', 0.06 + hoverBoost * 0.6);
    const mid = backgroundColor ?? '#141923';
    const bot = darken(backgroundColor ?? '#141923', 0.10);
    const grad = ctx.createLinearGradient(x, y, x, y + scaledH);
    grad.addColorStop(0.00, top);
    grad.addColorStop(0.50, mid);
    grad.addColorStop(1.00, bot);
    fillStyle = grad;
  }

  // ── Soft hover glow
  const glowColor = lighten(effectiveBorderColor, 0.15);
  const shadowBlur = Math.max(2, Math.min(18, (6 + 18 * glowBoost) * uiScale));

  // ── Draw background
  ctx.save();
  // The disabled state has an intrinsic alpha which IS part of the cached look.
  // The dynamic, animatable alpha from `button.style.alpha` is applied later.
  ctx.globalAlpha = disabled ? 0.45 : (style.backgroundAlpha ?? 1.0);
  if (!disabled) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = shadowBlur;
  }
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.roundRect(x, y, scaledW, scaledH, outerR);
  ctx.fill();
  ctx.restore();

  // ── Inner highlight edge
  ctx.save();
  const strokeW = Math.max(1, Math.floor(1 * uiScale));
  const inset = strokeW * 0.5;
  const innerR = Math.max(0, outerR - inset);
  ctx.globalAlpha = (0.10 + hoverBoost * 0.25) * (disabled ? 0.6 : 1);
  ctx.strokeStyle = lighten(backgroundColor ?? '#1a2230', 0.45);
  ctx.lineWidth = strokeW;
  ctx.beginPath();
  ctx.roundRect(x + inset, y + inset, scaledW - inset * 2, scaledH - inset * 2, innerR);
  ctx.stroke();
  ctx.restore();

  // ── Top glossy sweep (CLIPPED TO BUTTON SHAPE)
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, scaledW, scaledH, outerR);
  ctx.clip();
  const glossH = Math.min(scaledH * 0.42, 28 * uiScale);
  const gloss = ctx.createLinearGradient(x, y, x, y + glossH);
  gloss.addColorStop(0.0, rgba(255, 255, 255, (0.12 + hoverBoost * 0.10)));
  gloss.addColorStop(1.0, 'rgba(255,255,255,0.00)');
  const glossInset = Math.max(1, Math.floor(1 * uiScale));
  ctx.fillStyle = gloss;
  ctx.fillRect(x + glossInset, y + glossInset, scaledW - glossInset * 2, glossH - glossInset);
  ctx.restore();

  // ── Primary border
  ctx.save();
  ctx.globalAlpha = disabled ? 0.45 : 1.0;
  ctx.strokeStyle = effectiveBorderColor;
  ctx.lineWidth = Math.max(1, Math.floor(1 * uiScale));
  ctx.beginPath();
  ctx.roundRect(x, y, scaledW, scaledH, outerR);
  ctx.stroke();
  ctx.restore();

  // ── Neon micro-accents
  if (!disabled) {
    const accent = lighten(effectiveBorderColor, 0.25);
    const lineAlpha = (0.08 + hoverBoost * 0.12);
    const pad = Math.max(6, Math.min(14, scaledW * 0.08));
    const yTop = y + Math.max(2, Math.floor(2 * uiScale));
    const yBot = y + scaledH - Math.max(2, Math.floor(2 * uiScale));
    ctx.save();
    ctx.globalAlpha = lineAlpha;
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1, Math.floor(1 * uiScale));
    ctx.beginPath();
    ctx.moveTo(x + pad, yTop);
    ctx.lineTo(x + scaledW - pad, yTop);
    ctx.moveTo(x + pad, yBot);
    ctx.lineTo(x + scaledW - pad, yBot);
    ctx.stroke();
    ctx.restore();
  }

  // ── Label (monospace invariant)
  ctx.save();
  ctx.globalAlpha = 1.0; // Text is always drawn at full opacity within the cache
  ctx.fillStyle = effectiveTextColor;
  ctx.font = scaledFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (isHovered && !disabled) {
    ctx.shadowColor = lighten(effectiveTextColor, 0.35);
    ctx.shadowBlur = 2 * uiScale;
  }
  ctx.fillText(label, x + scaledW / 2, y + scaledH / 2);
  ctx.restore();
}


/* ──────────────────────────────────────────────────────────────────────────
   Public API
   -------------------------------------------------------------------------- */

/**
 * Renders a UIButton using a caching mechanism. If a cached version of the
 * button exists, it's drawn via `drawImage`. Otherwise, all variants are
 * rendered to new offscreen canvases, cached, and then drawn.
 * This is the primary function to be used for rendering buttons.
 */
export function drawButton(
  ctx: CanvasRenderingContext2D,
  button: UIButton,
  uiScale: number = 1.0,
  fontSize: number = 13,
  borderRadiusForcedScaling: number = 1,
): void {
  const cacheKey = getButtonCacheKey(button, uiScale, fontSize, borderRadiusForcedScaling);
  let cachedVariants = buttonCache.get(cacheKey);

  // Calculate padding needed for glow effects. This is constant for a given scale.
  const glowPadding = MAX_GLOW_PADDING * uiScale;

  // If the button isn't in the cache, render all its variants and cache them.
  if (!cachedVariants) {
    const scaledW = button.width * uiScale;
    const scaledH = button.height * uiScale;

    // Canvas dimensions must include padding for the glow.
    const canvasW = scaledW + glowPadding * 2;
    const canvasH = scaledH + glowPadding * 2;

    // Create offscreen canvases for each state with the new padded dimensions
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = canvasW;
    normalCanvas.height = canvasH;
    const normalCtx = normalCanvas.getContext('2d')!;

    const hoveredCanvas = document.createElement('canvas');
    hoveredCanvas.width = canvasW;
    hoveredCanvas.height = canvasH;
    const hoveredCtx = hoveredCanvas.getContext('2d')!;

    const disabledCanvas = document.createElement('canvas');
    disabledCanvas.width = canvasW;
    disabledCanvas.height = canvasH;
    const disabledCtx = disabledCanvas.getContext('2d')!;

    // Render each variant to its respective canvas, passing the padding amount.
    _renderButtonVariant(normalCtx, button, uiScale, fontSize, borderRadiusForcedScaling, 'normal', glowPadding);
    _renderButtonVariant(hoveredCtx, button, uiScale, fontSize, borderRadiusForcedScaling, 'hovered', glowPadding);
    _renderButtonVariant(disabledCtx, button, uiScale, fontSize, borderRadiusForcedScaling, 'disabled', glowPadding);

    cachedVariants = {
        normal: normalCanvas,
        hovered: hoveredCanvas,
        disabled: disabledCanvas
    };
    buttonCache.set(cacheKey, cachedVariants);
  }

  // Select the correct pre-rendered canvas based on the button's current state.
  const { disabled = false, isHovered = false, style = {} } = button;
  let canvasToDraw: HTMLCanvasElement;

  if (disabled) {
    canvasToDraw = cachedVariants.disabled;
  } else if (isHovered) {
    canvasToDraw = cachedVariants.hovered;
  } else {
    canvasToDraw = cachedVariants.normal;
  }

  // Draw the cached canvas, adjusting the position to account for the padding.
  // This ensures the button's visible body aligns with button.x/y, not the padded canvas corner.
  ctx.save();
  ctx.globalAlpha = style.alpha ?? 1.0;
  ctx.drawImage(canvasToDraw, button.x - glowPadding, button.y - glowPadding);
  ctx.restore();
}


/**
 * Handles interaction for a UIButton, computing hover and click state.
 * This function remains unchanged as it only deals with logic, not rendering.
 */
export function handleButtonInteraction(
  button: UIButton,
  mouseX: number,
  mouseY: number,
  wasClicked: boolean,
  uiScale: number = 1.0
): boolean {
  if (button.disabled) {
    button.isHovered = false;
    button.wasHovered = false;
    return false;
  }

  const scaledWidth = button.width * uiScale;
  const scaledHeight = button.height * uiScale;

  const isHoveredNow =
    mouseX >= button.x && mouseX <= button.x + scaledWidth &&
    mouseY >= button.y && mouseY <= button.y + scaledHeight;

  const justHovered = isHoveredNow && !button.wasHovered;
  const noLongerHovered = !isHoveredNow && button.wasHovered;

  button.isHovered = isHoveredNow;
  button.wasHovered = isHoveredNow;

  if (justHovered) {
    if (button.onHover) {
      button.onHover();
    } else {
      audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 4 });
    }

    GlobalEventBus.emit('cursor:change', { type: 'hovered' });
  }

  if (noLongerHovered) {
    GlobalEventBus.emit('cursor:restore', undefined);
  }

  if (isHoveredNow && wasClicked) {
    button.onClick();
    return true;
  }

  return false;
}