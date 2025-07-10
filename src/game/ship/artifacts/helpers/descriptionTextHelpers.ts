import { drawLabel } from '@/ui/primitives/UILabel';

const LINE_SPACING = 36;

interface TextSpan {
  text: string;
  color: string;
}

// Simple mapping from tag names to colors
const COLOR_MAP: Record<string, string> = {
  red: '#ff5555',
  green: '#88ff88',
  blue: '#66ccff',
  purple: '#7F00FF',
  yellow: '#ffff88',
  white: '#ffffff',
  gray: '#999999',
  cyan: '#00FFFF'
  // Extend as needed
};

/**
 * Parses a rich string into colored spans.
 */
function parseRichText(input: string, defaultColor: string): TextSpan[] {
  const spans: TextSpan[] = [];
  const tagRegex = /<(\/?)(\w+)>/g;

  let cursor = 0;
  let match: RegExpExecArray | null;
  let activeColor = defaultColor;
  const stack: string[] = [];

  while ((match = tagRegex.exec(input)) !== null) {
    const [tag, closingSlash, colorName] = match;
    const tagStart = match.index;
    const tagEnd = tagStart + tag.length;

    if (tagStart > cursor) {
      spans.push({
        text: input.slice(cursor, tagStart),
        color: activeColor,
      });
    }

    if (closingSlash) {
      stack.pop();
      activeColor = stack.length > 0 ? COLOR_MAP[stack[stack.length - 1]] || defaultColor : defaultColor;
    } else {
      stack.push(colorName);
      activeColor = COLOR_MAP[colorName] || defaultColor;
    }

    cursor = tagEnd;
  }

  // Remaining text after last tag
  if (cursor < input.length) {
    spans.push({
      text: input.slice(cursor),
      color: activeColor,
    });
  }

  return spans;
}

/**
 * Draws wrapped, color-tagged rich text.
 */
export function drawRichWrappedText(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  font: string,
  defaultColor: string,
  maxWidth: number,
  lineSpacing: number,
  uiScale: number
): void {
  ctx.font = font;
  const spans = parseRichText(text, defaultColor);

  let currentLine = '';
  let currentLineSpans: TextSpan[] = [];
  const lines: TextSpan[][] = [];

  for (const span of spans) {
    const words = span.text.split(/(\s+)/); // preserve spaces
    for (const word of words) {
      const testLine = currentLine + word;
      const width = ctx.measureText(testLine).width;

      if (width > maxWidth && currentLine !== '') {
        lines.push([...currentLineSpans]);
        currentLine = word;
        currentLineSpans = word.trim() === ''
          ? []
          : [{ text: word, color: span.color }];
      } else {
        currentLine += word;
        currentLineSpans.push({ text: word, color: span.color });
      }
    }
  }

  if (currentLineSpans.length > 0) {
    lines.push(currentLineSpans);
  }

  for (const lineSpans of lines) {
    let cursorX = x;
    for (const { text, color } of lineSpans) {
      drawLabel(ctx, cursorX, y, text, { font, color }, uiScale);
      cursorX += ctx.measureText(text).width * uiScale;
    }
    y += lineSpacing * uiScale;
  }
}

export function measureRichTextHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number,
  lineSpacing: number
): number {
  ctx.save();
  ctx.font = font;

  const spans = parseRichText(text, '#ffffff');
  let currentLine = '';
  let lineCount = 0;

  for (const span of spans) {
    const words = span.text.split(/(\s+)/);
    for (const word of words) {
      const testLine = currentLine + word;
      const width = ctx.measureText(testLine).width;

      if (width > maxWidth && currentLine !== '') {
        lineCount++;
        currentLine = word;
      } else {
        currentLine += word;
      }
    }
  }

  if (currentLine.trim() !== '') lineCount++;

  ctx.restore();

  // Convert to pixel height
  return (lineCount - 1) * lineSpacing + LINE_SPACING;
}
