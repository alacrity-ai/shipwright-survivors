import { drawLabel } from '@/ui/primitives/UILabel';

/**
 * Draws a label line, wrapping text as needed within the specified width.
 *
 * @param ctx - The rendering context.
 * @param x - Starting x position (unscaled).
 * @param y - Starting y position (unscaled).
 * @param label - Left-side label text.
 * @param value - Right-side value text.
 * @param labelColor - Optional color for the label text.
 * @param width - Max width to wrap within (screen space).
 * @param uiScale - UI scaling factor (default = 1.0).
 * @returns new y-position after drawing the wrapped lines.
 */
export function drawLabelLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string | number,
  labelColor = '#888',
  width: number,
  uiScale: number = 1.0
): number {
  const fontSize = Math.round(14 * uiScale);
  const font = `${fontSize}px monospace`;
  const lineHeight = 16 * uiScale;

  ctx.font = font;

  const text = `${label}: ${value}`;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > width && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    const hasColon = colonIndex !== -1;
    const labelPart = hasColon ? line.slice(0, colonIndex + 1) : '';
    const valuePart = hasColon ? line.slice(colonIndex + 1).trim() : line;

    drawLabel(ctx, x, y, [
      ...(hasColon ? [{ text: labelPart + ' ', color: labelColor }] : []),
      { text: valuePart, color: '#fff' }
    ], {
      font,
      align: 'left',
    });

    y += lineHeight;
  }

  return y;
}
