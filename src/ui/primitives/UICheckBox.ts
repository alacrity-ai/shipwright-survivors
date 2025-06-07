// // src/ui/primitives/UICheckbox.ts

// export interface UICheckbox {
//   x: number;
//   y: number;
//   size: number; // box size in pixels
//   label?: string;
//   checked: boolean;
//   isHovered?: boolean;
//   onToggle: (newValue: boolean) => void;

//   style?: {
//     boxColor?: string;
//     checkColor?: string;
//     hoverColor?: string;
//     labelColor?: string;
//     borderColor?: string;
//     font?: string;
//   };
// }

// const DEFAULT_STYLE = {
//   boxColor: '#222',
//   checkColor: '#0f0',
//   hoverColor: '#444',
//   labelColor: '#ccc',
//   borderColor: '#0f0',
//   font: '12px monospace'
// };

// export function drawCheckbox(
//   ctx: CanvasRenderingContext2D,
//   checkbox: UICheckbox
// ): void {
//   const {
//     x, y, size,
//     label,
//     checked,
//     isHovered,
//     style = {}
//   } = checkbox;

//   const {
//     boxColor,
//     checkColor,
//     hoverColor,
//     labelColor,
//     borderColor,
//     font
//   } = { ...DEFAULT_STYLE, ...style };

//   // === Box background ===
//   ctx.fillStyle = isHovered ? hoverColor : boxColor;
//   ctx.fillRect(x, y, size, size);

//   // === Border ===
//   ctx.strokeStyle = borderColor;
//   ctx.lineWidth = 1;
//   ctx.strokeRect(x, y, size, size);

//   // === Check mark ===
//   if (checked) {
//     ctx.fillStyle = checkColor;
//     ctx.beginPath();
//     ctx.moveTo(x + 3, y + size / 2);
//     ctx.lineTo(x + size / 2, y + size - 3);
//     ctx.lineTo(x + size - 3, y + 3);
//     ctx.lineWidth = 2;
//     ctx.strokeStyle = checkColor;
//     ctx.stroke();
//   }

//   // === Label text ===
//   if (label) {
//     ctx.font = font;
//     ctx.fillStyle = labelColor;
//     ctx.textAlign = 'left';
//     ctx.textBaseline = 'middle';
//     ctx.fillText(label, x + size + 8, y + size / 2);
//   }
// }

// src/ui/primitives/UICheckbox.ts

export interface UICheckbox {
  x: number; // pre-scaled absolute X
  y: number; // pre-scaled absolute Y
  size: number; // logical size (not scaled internally)
  label?: string;
  checked: boolean;
  isHovered?: boolean;
  onToggle: (newValue: boolean) => void;

  style?: {
    boxColor?: string;
    checkColor?: string;
    hoverColor?: string;
    labelColor?: string;
    borderColor?: string;
    font?: string;
  };
}

const DEFAULT_STYLE = {
  boxColor: '#222',
  checkColor: '#0f0',
  hoverColor: '#444',
  labelColor: '#ccc',
  borderColor: '#0f0',
  font: '12px monospace',
};

/**
 * Renders a checkbox UI element. All coordinates are expected to be pre-scaled.
 *
 * @param ctx - Canvas 2D context
 * @param checkbox - Checkbox configuration
 * @param uiScale - Scale factor for size, line width, and font size
 */
export function drawCheckbox(
  ctx: CanvasRenderingContext2D,
  checkbox: UICheckbox,
  uiScale: number = 1.0
): void {
  const {
    x, y, size,
    label,
    checked,
    isHovered,
    style = {}
  } = checkbox;

  const {
    boxColor,
    checkColor,
    hoverColor,
    labelColor,
    borderColor,
    font
  } = { ...DEFAULT_STYLE, ...style };

  const scaledSize = size * uiScale;

  const scaledFont = font.replace(
    /(\d+)(px)/,
    (_, sz, unit) => `${Math.round(parseInt(sz) * uiScale)}${unit}`
  );

  // === Checkbox Background ===
  ctx.fillStyle = isHovered ? hoverColor : boxColor;
  ctx.fillRect(x, y, scaledSize, scaledSize);

  // === Border ===
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1 * uiScale;
  ctx.strokeRect(x, y, scaledSize, scaledSize);

  // === Checkmark ===
  if (checked) {
    ctx.strokeStyle = checkColor;
    ctx.lineWidth = 2 * uiScale;
    ctx.beginPath();
    ctx.moveTo(x + 3 * uiScale, y + scaledSize / 2);
    ctx.lineTo(x + scaledSize / 2, y + scaledSize - 3 * uiScale);
    ctx.lineTo(x + scaledSize - 3 * uiScale, y + 3 * uiScale);
    ctx.stroke();
  }

  // === Label ===
  if (label) {
    ctx.font = scaledFont;
    ctx.fillStyle = labelColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + scaledSize + 8 * uiScale, y + scaledSize / 2);
  }
}
