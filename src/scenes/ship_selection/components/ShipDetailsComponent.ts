// src/scenes/ship_selection/components/ShipDetailsComponent.ts

import { getUniformScaleFactor } from '@/config/view';
import { drawLabel } from '@/ui/primitives/UILabel';
import type { CollectableShipDefinition } from '@/game/ship/interfaces/CollectableShipDefinition';

export class ShipDetailsComponent {
  private selectedShip: CollectableShipDefinition | null = null;

  setShip(def: CollectableShipDefinition): void {
    this.selectedShip = def;
  }

  render(ctx: CanvasRenderingContext2D, originX: number, originY: number): void {
    if (!this.selectedShip) return;

    const scale = getUniformScaleFactor();
    const lineHeight = 20 * scale;
    const centerX = originX;
    let cursorY = originY;

    const meta = this.selectedShip.metaData;
    if (!meta) return;

    // === Additional Description ===
    if (meta.additionalDescription) {
      drawLabel(ctx, centerX, cursorY, meta.additionalDescription, {
        font: `${12 * scale}px monospace`,
        align: 'center',
        color: '#cccccc',
      });
      cursorY += lineHeight;
    }

    // === Ratings ===
    const renderRatingRow = (label: string, value?: number, color = '#ffffff') => {
      if (value != null) {
        drawLabel(ctx, centerX, cursorY, `${label}: ${'★'.repeat(value)}`, {
          font: `${12 * scale}px monospace`,
          align: 'center',
          color,
        });
        cursorY += lineHeight;
      }
    };

    renderRatingRow('Offense', meta.offenseRating, '#ff4444');
    renderRatingRow('Defense', meta.defenseRating, '#44aaff');
    renderRatingRow('Speed', meta.speedRating, '#ffff44');

    // === Weapon Specialization ===
    if (meta.weaponSpecialization) {
      drawLabel(ctx, centerX, cursorY, `Specialty: ${meta.weaponSpecialization}`, {
        font: `${12 * scale}px monospace`,
        align: 'center',
        color: '#ff99ff',
      });
    }
  }
}
