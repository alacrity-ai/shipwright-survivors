// src/ui/overlays/HudOverlay.ts

import type { Ship } from '@/game/ship/Ship';
import type { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';
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

  render(): void {
    const ctx = this.canvasManager.getContext('ui');
    const { velocity } = this.ship.getTransform();

    const blocks = this.ship.getAllBlocks();
    const mass = blocks.reduce((sum, [_, b]) => sum + b.type.mass, 0);
    const currentHp = blocks.reduce((sum, [_, b]) => sum + b.hp, 0);
    const maxHp = blocks.reduce((sum, [_, b]) => sum + b.type.armor, 0);
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);

    const energyComponent = this.ship.getEnergyComponent();
    const energy = energyComponent?.getCurrent() ?? 0;
    const maxEnergy = energyComponent?.getMax() ?? 0;

    const x = 12;
    let y = 630;
    const lineHeight = 18;

    drawLabel(ctx, x, y, `Armor: ${currentHp} / ${maxHp}`); y += lineHeight;
    drawLabel(ctx, x, y, `Energy: ${Math.round(energy)} / ${maxEnergy}`); y += lineHeight;
    drawLabel(ctx, x, y, `Mass: ${mass.toFixed(1)} kg`); y += lineHeight;
    drawLabel(ctx, x, y, `Speed: ${speed.toFixed(1)} px/s`); y += lineHeight;
    drawLabel(ctx, x, y, `Currency: ${this.currency}`);
  }

  destroy(): void {
    this.disposer?.();
  }
}

