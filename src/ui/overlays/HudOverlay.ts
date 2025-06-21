// src/ui/hud/HudOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { Ship } from '@/game/ship/Ship';
import type { PlayerResources } from '@/game/player/PlayerResources';
import type { FloatingTextManager } from '@/rendering/floatingtext/FloatingTextManager';
import type { BlockDropDecisionMenu } from '@/ui/menus/BlockDropDecisionMenu';
import type { InputManager } from '@/core/InputManager';

import { drawUIResourceBar } from '@/ui/primitives/UIResourceBar';
import { drawUIVerticalResourceBar } from '@/ui/primitives/UIVerticalResourceBar';
import { drawFiringModeToggle } from '@/ui/primitives/UIFiringModeToggle';
import { drawLabel } from '@/ui/primitives/UILabel';
import { getUniformScaleFactor } from '@/config/view';

import { PlayerResources as PlayerResourcesSingleton } from '@/game/player/PlayerResources';
import { BlockQueueDisplayManager } from '@/ui/overlays/components/BlockQueueDisplayManager';

export class HudOverlay {
  private readonly playerResources: PlayerResources;
  private readonly blockQueueDisplayManager: BlockQueueDisplayManager;

  private currency: number = 0;
  private previousCurrency: number = 0;
  private disposer: (() => void) | null = null;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly ship: Ship,
    private readonly floatingTextManager: FloatingTextManager,
    private readonly blockDropDecisionMenu: BlockDropDecisionMenu,
    private readonly inputManager: InputManager,
  ) {
    this.inputManager = inputManager;
    this.playerResources = PlayerResourcesSingleton.getInstance();
    this.currency = this.playerResources.getCurrency();
    this.previousCurrency = this.currency;

    this.disposer = this.playerResources.onCurrencyChange((newValue) => {
      if (newValue > this.currency) {
        const ctx = this.canvasManager.getContext('ui');
        const gained = newValue - this.currency;

        const uiScale = getUniformScaleFactor();
        const screenX = Math.floor(900 * uiScale) + Math.floor(80 * uiScale);
        const y = ctx.canvas.height - Math.floor(24 * uiScale);
        const screenY = y - Math.floor(12 * uiScale);

        this.floatingTextManager.createScreenText(
          `+${gained}`,
          screenX,
          screenY,
          12,
          'monospace',
          1,
          100,
          1.0,
          '#FFD700',
          { impactScale: 1.5 },
          'currency'
        );
      }

      this.currency = newValue;
    });

    // Pass through the blockDropDecisionMenu
    this.blockQueueDisplayManager = new BlockQueueDisplayManager(
      this.canvasManager,
      this.playerResources,
      this.blockDropDecisionMenu,
      this.inputManager
    );
  }

  update(dt: number): void {
    this.blockQueueDisplayManager.update(dt);
  }

  render(dt: number): void {
    const scale = getUniformScaleFactor();
    const ctx = this.canvasManager.getContext('ui');
    const canvas = ctx.canvas;

    const { velocity } = this.ship.getTransform();
    // const blocks = this.ship.getAllBlocks();
    const mass = this.ship.getTotalMass();
    const currentHp = Math.floor(this.ship.getCockpitHp() ?? 0);
    const maxHp = Math.floor(this.ship.getCockpit()?.type.armor ?? 1);
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);

    const energyComponent = this.ship.getEnergyComponent();
    const energy = Math.floor(energyComponent?.getCurrent() ?? 0);
    const maxEnergy = Math.floor(energyComponent?.getMax() ?? 0);

    const barWidth = Math.floor(180 * scale);
    const barHeight = Math.floor(12 * scale);
    const spacing = Math.floor(20 * scale);
    const totalWidth = barWidth * 2 + spacing;
    const baseX = Math.floor((canvas.width - totalWidth) / 2);
    const y = canvas.height - Math.floor(24 * scale);

    // === Afterburner Fuel Bar ===
    const afterburnerComponent = this.ship.getAfterburnerComponent();
    const afterburnerValue = afterburnerComponent ? afterburnerComponent.getCurrent() : 0;
    const afterburnerMax = afterburnerComponent ? afterburnerComponent.getMax() : 1;

    drawUIResourceBar(ctx, {
      x: baseX,
      y,
      width: barWidth,
      height: barHeight,
      value: afterburnerValue / afterburnerMax,
      label: `${Math.floor(afterburnerValue)} / ${afterburnerMax}`,
      style: {
        barColor: '#ffcc00',
        borderColor: '#ffee88',
        backgroundColor: '#221800',
        glow: true,
        textColor: '#ffffaa',
        font: `${Math.floor(11 * scale)}px "Courier New", monospace`,
        scanlineIntensity: 0.3,
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

    // === Energy Bar ===
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
        font: `${Math.floor(11 * scale)}px "Courier New", monospace`,
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

    // === Speed Bar (Vertical) ===
    const speedBarHeight = Math.floor(120 * scale);
    const speedBarWidth = Math.floor(12 * scale);
    const speedBarX = Math.floor(32 * scale);
    const speedBarY = y - speedBarHeight + Math.floor(14 * scale);

    drawUIVerticalResourceBar(ctx, {
      x: speedBarX,
      y: speedBarY,
      width: speedBarWidth,
      height: speedBarHeight,
      value: speed,
      maxValue: 2000,
      style: {
        barColor: '#00ff41',
        backgroundColor: '#001100',
        borderColor: '#00aa33',
        glow: true,
        textColor: '#00ff88',
        showLabel: true,
        unit: 'm/s',
      }
    });

    // === Firing Mode Toggle ===
    const toggleWidth = Math.floor(120 * scale);
    const toggleHeight = Math.floor(24 * scale);
    const toggleX = Math.floor(64 * scale);
    const toggleY = y - Math.floor(12 * scale);

    drawFiringModeToggle(ctx, {
      x: toggleX,
      y: toggleY,
      mode: this.ship.getFiringMode(),
      style: {
        width: toggleWidth,
        height: toggleHeight,
        backgroundColor: '#000a00',
        borderColor: '#00ff41',
        activeColor: '#00ff41',
        inactiveColor: '#001a00',
        textColor: '#00ff41',
        glowColor: '#00ff41',
        font: `${Math.floor(10 * scale)}px "Courier New", monospace`,
        glow: true,
        animated: true,
        scanlineIntensity: 0.3,
        chromaticAberration: false,
      }
    }, performance.now());

    // === Additional Metrics ===
    const infoX = Math.floor(900 * scale);
    const lineHeight = Math.floor(16 * scale);
    let infoY = toggleY;

    drawLabel(ctx, infoX, infoY, `Entropium: ${this.currency}`, {}, scale);
    infoY += lineHeight;
    drawLabel(ctx, infoX, infoY, `Mass: ${mass.toFixed(1)} kg`, {}, scale);

    // === Block Queue Display ===
    this.blockQueueDisplayManager.render();
  }

  destroy(): void {
    this.disposer?.();
  }
}
