import { drawUIResourceBar } from '@/ui/primitives/UIResourceBar';
import type { Ship } from '@/game/ship/Ship';

import { getUniformScaleFactor } from '@/config/view';

const BAR_WIDTH = 400;
const BAR_HEIGHT = 24;

export function drawBossHealthbar(ctx: CanvasRenderingContext2D, bossShip: Ship): void {
  if (!bossShip.hasHealth()) return;

  const x = ctx.canvas.width / 2 - BAR_WIDTH / 2;
  const y = 36 * getUniformScaleFactor();

  const current = bossShip.getCurrentHealth();
  const max = bossShip.getMaxHealth();
  const percent = Math.max(0, Math.min(1, current / max));

  console.log('Drawing healthbar:', percent);

  drawUIResourceBar(ctx, {
    x,
    y,
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    value: percent,
    label: `${Math.ceil(current)} / ${max}`,
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
      font: '12px "Orbitron", monospace',
      textColor: '#ffcccc',
    },
  });
}
