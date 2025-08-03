import { drawUIResourceBar } from '@/ui/primitives/UIResourceBar';
import type { Ship } from '@/game/ship/Ship';

import { getUniformScaleFactor } from '@/config/view';

const BAR_WIDTH = 600;
const BAR_HEIGHT = 24;

export function drawBossHealthbar(ctx: CanvasRenderingContext2D, bossShip: Ship): void {
  if (!bossShip.hasHealth()) return;

  const scale = getUniformScaleFactor();
  const scaledBarWidth = BAR_WIDTH * scale;
  const scaledBarHeight = BAR_HEIGHT * scale;

  const x = ctx.canvas.width / 2 - scaledBarWidth / 2;
  const y = ctx.canvas.height - 36 * scale;

  const current = bossShip.getCurrentHealth();
  const max = bossShip.getMaxHealth();
  const percent = Math.max(0, Math.min(1, current / max));

  const fontSize = 14 * scale;

  drawUIResourceBar(ctx, {
    x,
    y,
    width: scaledBarWidth,
    height: scaledBarHeight,
    value: percent,
    label: `${Math.round(percent * 100)}%`,
    style: {
      barColor: '#ff3333',
      backgroundColor: '#220000',
      borderColor: '#ff3333',
      warningColor: '#ffaa00',
      criticalColor: '#ff0040',
      warningThreshold: 0.3,
      criticalThreshold: 0.15,
      glow: true,
      animated: true,
      chromaticAberration: true,
      scanlineIntensity: 0.3,
      cornerBevel: true,
      criticalAnimation: true,
      font: `${fontSize}px "Orbitron", monospace`,
      textColor: '#ffcccc',
    },
  });
}
