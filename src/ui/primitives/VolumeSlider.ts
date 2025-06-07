// src/ui/primitives/VolumeSlider.ts

export interface VolumeSlider {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number; // In [0, 1]
  onChange: (newValue: number) => void;

  isHovered?: boolean;
  isDragging?: boolean;

  style?: {
    barColor?: string;
    knobColor?: string;
    backgroundColor?: string;
    borderColor?: string;
    labelColor?: string;
  };
}

const DEFAULT_STYLE = {
  barColor: '#0f0',
  knobColor: '#6f6',
  backgroundColor: '#111',
  borderColor: '#0f0',
  labelColor: '#ccc',
};

/**
 * Draws a volume slider with optional percentage and identity label.
 *
 * @param ctx - Canvas 2D context
 * @param slider - VolumeSlider config
 * @param uiScale - UI scale factor (default = 1.0)
 * @param identityLabel - Optional label shown to the right of the slider
 * @param showValueLabel - Whether to show "%"-based value label at right of bar (default: true)
 */
export function drawVolumeSlider(
  ctx: CanvasRenderingContext2D,
  slider: VolumeSlider,
  uiScale: number = 1.0,
  identityLabel?: string,
  showValueLabel: boolean = true
): void {
  const {
    x, y, width, height,
    value,
    style = {},
    isHovered,
  } = slider;

  const {
    barColor,
    knobColor,
    backgroundColor,
    borderColor,
    labelColor,
  } = { ...DEFAULT_STYLE, ...style };

  const scaledW = width * uiScale;
  const scaledH = height * uiScale;
  const font = `${Math.round(12 * uiScale)}px monospace`;
  const midY = y + scaledH / 2;

  // === Background Bar ===
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(x, y, scaledW, scaledH);

  // === Filled Portion ===
  const filledW = Math.round(value * scaledW);
  ctx.fillStyle = barColor;
  ctx.fillRect(x, y, filledW, scaledH);

  // === Knob ===
  const knobX = x + filledW;
  const knobRadius = scaledH / 2;
  ctx.beginPath();
  ctx.arc(knobX, midY, knobRadius, 0, Math.PI * 2);
  ctx.fillStyle = isHovered ? '#fff' : knobColor;
  ctx.fill();

  // === Border ===
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1 * uiScale;
  ctx.strokeRect(x, y, scaledW, scaledH);

  // === Right-aligned % label
  let cursorX = x + scaledW;
  ctx.font = font;
  ctx.fillStyle = labelColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  if (showValueLabel) {
    const percentPadding = 8 * uiScale;
    cursorX += percentPadding;

    const percentText = `${Math.round(value * 100)}%`;
    ctx.fillText(percentText, cursorX, midY);

    const textMetrics = ctx.measureText(percentText);
    cursorX += textMetrics.width;
  }

  // === Identity label
  if (identityLabel) {
    const labelPadding = 12 * uiScale;
    cursorX += labelPadding;

    ctx.fillText(identityLabel, cursorX, midY);
  }
}
