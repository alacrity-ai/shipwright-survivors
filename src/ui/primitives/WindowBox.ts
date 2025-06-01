// src/ui/primitives/WindowBox.ts

import { brightenColor } from '@/shared/colorUtils';

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
    from?: [number, number]; // default: top-left
    to?: [number, number];   // default: bottom-right
    radius?: number;         // for radial
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
}

export function drawWindow(config: DrawWindowConfig): boolean {
  const {
    ctx, x, y, width, height,
    title,
    tabs,
    mouse,
    clicked,
    options = {}
  } = config;

  const borderRadius = options.borderRadius ?? 8;
  const backgroundColor = options.backgroundColor ?? '#111';
  const borderColor = options.borderColor ?? '#555';
  const alpha = options.alpha ?? 1.0;

  ctx.save();
  ctx.globalAlpha = alpha;

  let fillStyle: string | CanvasGradient = backgroundColor;

  if (options.backgroundGradient) {
    const { type, stops, from = [x, y], to = [x + width, y + height], radius = width / 2 } = options.backgroundGradient;

    const gradient = type === 'linear'
      ? ctx.createLinearGradient(from[0], from[1], to[0], to[1])
      : ctx.createRadialGradient(
          from[0], from[1], 0,
          from[0], from[1], radius
        );

    for (const stop of stops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    fillStyle = gradient;
  }

  ctx.fillStyle = fillStyle;

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.fill();
  ctx.stroke();

  if (title) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(title, x + 42, y + 16);
  }

  let tabWasClicked = false;

  if (tabs && tabs.length > 0) {
    const tabHeight = 24;
    const tabWidth = Math.floor((width - 16) / tabs.length);

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tx = x + 8 + i * tabWidth;
      const ty = y - tabHeight;
      const tw = tabWidth - 4;

      const isHovered =
        mouse &&
        mouse.x >= tx &&
        mouse.x <= tx + tw &&
        mouse.y >= ty &&
        mouse.y <= ty + tabHeight;

      if (clicked && isHovered) {
        tabs.forEach(t => t.isActive = false);
        tab.isActive = true;
        tab.onClick();
        tabWasClicked = true;
      }

      // === Tab background: use window fillStyle for inactive; active uses activeTabColor if provided ===
      ctx.fillStyle = tab.isActive
        ? options.activeTabColor ?? borderColor
        : fillStyle;

      ctx.strokeStyle = borderColor;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, tabHeight, [borderRadius, borderRadius, 0, 0]);
      ctx.fill();
      ctx.stroke();

      // === Tab label: use borderColor for inactive, activeTabColor for active (fallbacks preserved) ===
      ctx.fillStyle = tab.isActive
        ? options.activeTabColor ?? borderColor
        : borderColor;

      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tab.label, tx + tw / 2, ty + tabHeight / 2);
    }

    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }


  ctx.restore();
  return tabWasClicked;
}
