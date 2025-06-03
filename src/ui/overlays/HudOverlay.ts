import type { Ship } from '@/game/ship/Ship';
import type { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawUIResourceBar } from '@/ui/primitives/UIResourceBar';
import { drawUIVerticalResourceBar } from '@/ui/primitives/UIVerticalResourceBar';
import { PlayerResources } from '@/game/player/PlayerResources';

export class HudOverlay {
  private playerResources: PlayerResources;
  private currency: number = 0;
  private disposer: (() => void) | null = null;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly ship: Ship
  ) {
    this.playerResources = PlayerResources.getInstance();
    this.currency = this.playerResources.getCurrency();

    this.disposer = this.playerResources.onCurrencyChange((newValue) => {
      this.currency = newValue;
    });
  }

  render(dt: number): void {
    const ctx = this.canvasManager.getContext('ui');
    const { velocity } = this.ship.getTransform();

    const blocks = this.ship.getAllBlocks();
    const mass = blocks.reduce((sum, [_, b]) => sum + b.type.mass, 0);
    const currentHp = this.ship.getCockpitHp() ?? 0;
    const maxHp = this.ship.getCockpit()?.type.armor ?? 1;
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);

    const energyComponent = this.ship.getEnergyComponent();
    const energy = energyComponent?.getCurrent() ?? 0;
    const maxEnergy = energyComponent?.getMax() ?? 0;

    const canvas = ctx.canvas;
    const barWidth = 180;
    const barHeight = 12;
    const spacing = 20;
    const totalWidth = barWidth * 2 + spacing;

    const baseX = Math.floor((canvas.width - totalWidth) / 2);
    const y = canvas.height - 24;

    // === Draw Health Bar ===
    drawUIResourceBar(ctx, {
      x: baseX,
      y,
      width: barWidth,
      height: barHeight,
      value: maxHp > 0 ? currentHp / maxHp : 0,
      label: `${currentHp} / ${maxHp}`,
      style: {
        barColor: '#c33',
        borderColor: '#f66',
        backgroundColor: '#200',
        glow: true,
        textColor: '#f88',
        font: '11px "Courier New", monospace',
        scanlineIntensity: 0.3,
        chromaticAberration: true,
        phosphorDecay: true,
        cornerBevel: true,
        warningThreshold: 0.3,
        criticalThreshold: 0.15,
        warningColor: '#ffaa00',
        criticalColor: '#ff0040',
        animated: true,
      }
    }, performance.now());

    // === Draw Energy Bar ===
    drawUIResourceBar(ctx, {
      x: baseX + barWidth + spacing,
      y,
      width: barWidth,
      height: barHeight,
      value: maxEnergy > 0 ? energy / maxEnergy : 1,
      label: `${Math.round(energy)} / ${maxEnergy}`,
      style: {
        barColor: '#0af',
        borderColor: '#6cf',
        backgroundColor: '#003',
        glow: true,
        textColor: '#9cf',
        font: '11px "Courier New", monospace',
        scanlineIntensity: 0.25,
        chromaticAberration: true,
        phosphorDecay: true,
        cornerBevel: true,
        warningThreshold: 0.25,
        criticalThreshold: 0.1,
        warningColor: '#ffaa00',
        criticalColor: '#ff0040',
        animated: true,
      }
    }, performance.now());

    // === Draw Speed Bar (Vertical) ===
    const speedBarHeight = 120;
    drawUIVerticalResourceBar(ctx, {
      x: 32,
      y: y - speedBarHeight + 14,
      width: 12,
      height: speedBarHeight,
      value: speed,
      maxValue: 2000,
      style: {
        barColor: '#00ff41',             // Classic green phosphor
        backgroundColor: '#001100',      // Deep green-black CRT background
        borderColor: '#00aa33',          // Dimmer border for retro casing feel
        glow: true,
        textColor: '#00ff88',            // Softer green for readouts
        showLabel: true,
        unit: 'm/s',
      }
    });

    // === Additional Metrics: Mass & Entropium ===
    let infoY = y - 12;
    const infoX = 64;
    const lineHeight = 16;

    drawLabel(ctx, infoX, infoY, `Mass: ${mass.toFixed(1)} kg`); infoY += lineHeight;
    drawLabel(ctx, infoX, infoY, `Entropium: ${this.currency}`);
  }

  destroy(): void {
    this.disposer?.();
  }
}
