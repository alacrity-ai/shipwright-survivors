// // src/ui/primitives/UILabel.ts

// import { getUIScale } from '@/ui/menus/helpers/getUIScale'; // ADDED IMPORT

// type LabelSegment = {
//   text: string;
//   color?: string;
// };

// type LabelInput = string | LabelSegment[];

// interface LabelDrawOptions {
//   font?: string;
//   align?: CanvasTextAlign;
//   alpha?: number;
//   shadowBlur?: number;
//   shadowColor?: string;
//   glow?: boolean;    // shorthand for green glow
//   color?: string;    // fallback or default color
// }

// export function drawLabel(
//   ctx: CanvasRenderingContext2D,
//   x: number,
//   y: number,
//   text: LabelInput,
//   options?: LabelDrawOptions
// ) {
//   const {
//     font = '12px monospace',
//     align = 'left',
//     alpha = 1.0,
//     shadowBlur = 0,
//     shadowColor = '',
//     glow = false,
//     color = '#00ff00'
//   } = options ?? {};

//   ctx.save();
//   ctx.globalAlpha = alpha;
//   ctx.font = font;
//   ctx.textAlign = align;
//   ctx.textBaseline = 'top';

//   if (glow) {
//     ctx.shadowBlur = 6;
//     ctx.shadowColor = '#00ff00';
//   } else if (shadowBlur > 0 && shadowColor) {
//     ctx.shadowBlur = shadowBlur;
//     ctx.shadowColor = shadowColor;
//   }

//   if (typeof text === 'string') {
//     ctx.fillStyle = color;
//     ctx.fillText(text, x, y);
//   } else {
//     let cursorX = x;
//     for (const segment of text) {
//       ctx.fillStyle = segment.color ?? color;
//       ctx.fillText(segment.text, cursorX, y);
//       cursorX += ctx.measureText(segment.text).width;
//     }
//   }

//   ctx.restore();
// }

// src/ui/primitives/UILabel.ts
type LabelSegment = {
  text: string;
  color?: string;
};

type LabelInput = string | LabelSegment[];

export interface LabelDrawOptions {
  font?: string;             // e.g. '12px monospace'
  align?: CanvasTextAlign;   // left, right, center
  alpha?: number;            // global alpha
  shadowBlur?: number;
  shadowColor?: string;
  glow?: boolean;            // shortcut for green glow
  color?: string;            // default text color
}

/**
 * Renders a label or segmented label to the canvas, supporting styles and scaling.
 *
 * @param ctx - Canvas 2D context
 * @param x - Absolute (pre-scaled) x position
 * @param y - Absolute (pre-scaled) y position
 * @param text - Plain string or color-coded segments
 * @param options - Visual styling options
 * @param uiScale - Font/blur scale factor (default: 1.0)
 */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: LabelInput,
  options?: LabelDrawOptions,
  uiScale: number = 1.0
): void {
  const {
    font = '12px monospace',
    align = 'left',
    alpha = 1.0,
    shadowBlur = 0,
    shadowColor = '',
    glow = false,
    color = '#00ff00',
  } = options ?? {};

  // Scale font size numerically if present
  const scaledFont = font.replace(
    /(\d+)(px)/,
    (_, size, unit) => `${Math.round(parseInt(size) * uiScale)}${unit}`
  );

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = scaledFont;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  // === Apply glow/shadow ===
  if (glow) {
    ctx.shadowBlur = 6 * uiScale;
    ctx.shadowColor = '#00ff00';
  } else if (shadowBlur > 0 && shadowColor) {
    ctx.shadowBlur = shadowBlur * uiScale;
    ctx.shadowColor = shadowColor;
  }

  // === Render text ===
  if (typeof text === 'string') {
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  } else {
    let cursorX = x;
    for (const segment of text) {
      ctx.fillStyle = segment.color ?? color;
      ctx.fillText(segment.text, cursorX, y);
      cursorX += ctx.measureText(segment.text).width;
    }
  }

  ctx.restore();
}
