// // src/ui/primitives/CRTText.ts

// interface CRTTextStyle {
//   font?: string;
//   color?: string;
//   glow?: boolean;
//   chromaticAberration?: boolean;
//   align?: CanvasTextAlign;
//   baseline?: CanvasTextBaseline;
// }

// export function drawCRTText(
//   ctx: CanvasRenderingContext2D,
//   x: number,
//   y: number,
//   text: string,
//   style: CRTTextStyle = {}
// ): void {
//   const {
//     font = '14px "Courier New", monospace',
//     color = '#00ff41',
//     glow = true,
//     chromaticAberration = true,
//     align = 'left',
//     baseline = 'top'
//   } = style;

//   ctx.save();
//   ctx.font = font;
//   ctx.textAlign = align;
//   ctx.textBaseline = baseline;

//   if (glow) {
//     ctx.shadowColor = color;
//     ctx.shadowBlur = 4;
//   }

//   // Chromatic offset passes
//   if (chromaticAberration) {
//     ctx.save();
//     ctx.shadowBlur = 0;
//     ctx.globalAlpha = 0.25;
//     ctx.fillStyle = '#ff0000';
//     ctx.fillText(text, x - 0.5, y);
//     ctx.fillStyle = '#0000ff';
//     ctx.fillText(text, x + 0.5, y);
//     ctx.restore();
//   }

//   ctx.globalAlpha = 1.0;
//   ctx.fillStyle = color;
//   ctx.fillText(text, x, y);
//   ctx.restore();
// }

// src/ui/primitives/CRTText.ts

export interface CRTTextStyle {
  font?: string;
  color?: string;
  glow?: boolean;
  chromaticAberration?: boolean;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}

/**
 * Draws stylized CRT-style text with optional chromatic aberration and glow.
 *
 * @param ctx - Canvas 2D rendering context
 * @param x - X position (already scaled)
 * @param y - Y position (already scaled)
 * @param text - Text string to render
 * @param style - CRT-specific styling options
 * @param uiScale - Global UI scale factor (default: 1.0)
 */
export function drawCRTText(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  style: CRTTextStyle = {},
  uiScale: number = 1.0
): void {
  const {
    font = '14px "Courier New", monospace',
    color = '#00ff41',
    glow = true,
    chromaticAberration = true,
    align = 'left',
    baseline = 'top',
  } = style;

  const scaledFont = font.replace(
    /(\d+)(px)/,
    (_, size, unit) => `${Math.round(parseInt(size) * uiScale)}${unit}`
  );

  const aberrationOffset = 0.5 * uiScale;

  ctx.save();
  ctx.font = scaledFont;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  // === Optional glow ===
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 4 * uiScale;
  }

  // === Chromatic Aberration ===
  if (chromaticAberration) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.25;

    ctx.fillStyle = '#ff0000';
    ctx.fillText(text, x - aberrationOffset, y);

    ctx.fillStyle = '#0000ff';
    ctx.fillText(text, x + aberrationOffset, y);

    ctx.restore();
  }

  // === Main Fill ===
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  ctx.restore();
}
