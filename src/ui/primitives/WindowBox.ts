// src/ui/primitives/WindowBox.ts

export interface WindowTab {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export interface DrawWindowOptions {
  borderRadius?: number;
  backgroundColor?: string;
  borderColor?: string;
  alpha?: number;
  activeTabColor?: string;
  backgroundGradient?: {
    type: 'linear' | 'radial';
    stops: { offset: number; color: string }[];
    from?: [number, number];
    to?: [number, number];
    radius?: number;
  };
}

export interface DrawWindowConfig {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  tabs?: WindowTab[];
  mouse?: { x: number; y: number };
  clicked?: boolean;
  options?: DrawWindowOptions;
  uiScale?: number;
}

/**
 * Draws a window with optional title and tabs.
 * Returns `true` if a tab was clicked.
 */
export function drawWindow(config: DrawWindowConfig): boolean {
  const {
    ctx,
    x, y, width, height,
    title,
    tabs,
    mouse,
    clicked,
    options = {},
    uiScale = 1.0,
  } = config;

  const {
    borderRadius = 8,
    backgroundColor = '#111',
    borderColor = '#555',
    alpha = 1.0,
    activeTabColor = borderColor,
    backgroundGradient,
  } = options;

  const drawW = width * uiScale;
  const drawH = height * uiScale;
  const drawR = borderRadius * uiScale;

  ctx.save();
  ctx.globalAlpha = alpha;

  // === Gradient or Solid Fill ===
  let fillStyle: string | CanvasGradient = backgroundColor;

  if (backgroundGradient) {
    const {
      type,
      stops,
      from = [x, y],
      to = [x + width, y + height],
      radius = width / 2,
    } = backgroundGradient;

    const fromScaled: [number, number] = [from[0] * uiScale, from[1] * uiScale];
    const toScaled: [number, number] = [to[0] * uiScale, to[1] * uiScale];

    const gradient = type === 'linear'
      ? ctx.createLinearGradient(fromScaled[0], fromScaled[1], toScaled[0], toScaled[1])
      : ctx.createRadialGradient(
          fromScaled[0], fromScaled[1], 0,
          fromScaled[0], fromScaled[1], radius * uiScale
        );

    for (const stop of stops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    fillStyle = gradient;
  }

  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2 * uiScale;
  ctx.beginPath();
  ctx.roundRect(x, y, drawW, drawH, drawR);
  ctx.fill();
  ctx.stroke();

  // === Title Text ===
  if (title) {
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(14 * uiScale)}px monospace`;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + 42 * uiScale, y + 8 * uiScale);
  }

  let tabWasClicked = false;

  if (!tabs?.length) {
    ctx.restore();
    return false;
  }

  const tabHeight = 24 * uiScale;
  const tabMargin = 8 * uiScale;
  const tabWidth = Math.floor((drawW - 2 * tabMargin) / tabs.length);

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const tx = x + tabMargin + i * tabWidth;
    const ty = y - tabHeight;
    const tw = tabWidth - 4 * uiScale;

    const isHovered =
      mouse &&
      mouse.x >= tx &&
      mouse.x <= tx + tw &&
      mouse.y >= ty &&
      mouse.y <= ty + tabHeight;

    if (clicked && isHovered) {
      tabs.forEach(t => (t.isActive = false));
      tab.isActive = true;
      tab.onClick();
      tabWasClicked = true;
    }

    ctx.fillStyle = tab.isActive ? activeTabColor : fillStyle;
    ctx.strokeStyle = borderColor;

    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, tabHeight, [drawR, drawR, 0, 0]);
    ctx.fill();
    ctx.stroke();

    ctx.font = `${Math.round(12 * uiScale)}px monospace`;
    ctx.fillStyle = tab.isActive ? '#000' : borderColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tab.label, tx + tw / 2, ty + tabHeight / 2);
  }

  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  return tabWasClicked;
}

