// src/ui/overlays/HudOverlay.ts

import type { Ship } from '@/game/ship/Ship';
import type { CanvasManager } from '@/core/CanvasManager';
import { drawLabel } from '@/ui/primitives/UILabel';
import { PlayerResources } from '@/game/player/PlayerResources';

export class HudOverlay {
  private playerResources: PlayerResources;
  private currency: number = 0;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly ship: Ship
  ) {
    // Get the PlayerResources singleton
    this.playerResources = PlayerResources.getInstance();
    
    // Initialize with current currency value
    this.currency = this.playerResources.getCurrency();
    
    // Subscribe to currency changes
    this.playerResources.onCurrencyChange((newValue) => {
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

    const x = 12;
    let y = 640;
    const lineHeight = 18;

    drawLabel(ctx, x, y, `HP: ${currentHp} / ${maxHp}`); y += lineHeight;
    drawLabel(ctx, x, y, `Mass: ${mass.toFixed(1)} kg`); y += lineHeight;
    drawLabel(ctx, x, y, `Speed: ${speed.toFixed(1)} px/s`); y += lineHeight;
    drawLabel(ctx, x, y, `Currency: ${this.currency}`);
  }
}
