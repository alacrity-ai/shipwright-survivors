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

export function drawVolumeSlider(
  ctx: CanvasRenderingContext2D,
  slider: VolumeSlider
): void {
  const {
    x, y, width, height,
    value,
    style = {},
    isHovered
  } = slider;

  const {
    barColor,
    knobColor,
    backgroundColor,
    borderColor,
    labelColor
  } = { ...DEFAULT_STYLE, ...style };

  // === Draw value as percentage ===
  ctx.font = '12px monospace';
  ctx.fillStyle = labelColor;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(value * 100)}%`, x + width + 32, y + height / 2);

  // === Background bar ===
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(x, y, width, height);

  // === Filled volume bar ===
  const filledWidth = Math.round(value * width);
  ctx.fillStyle = barColor;
  ctx.fillRect(x, y, filledWidth, height);

  // === Knob ===
  const knobX = x + filledWidth;
  const knobRadius = height / 2;
  ctx.beginPath();
  ctx.arc(knobX, y + height / 2, knobRadius, 0, Math.PI * 2);
  ctx.fillStyle = isHovered ? '#fff' : knobColor;
  ctx.fill();

  // === Border ===
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
}
