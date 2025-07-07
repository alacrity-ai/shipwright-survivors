// src/game/ship/artifacts/ui/ArtifactCollectionUIRenderer.ts

import { drawArtifactSlot } from './ArtifactSlotRenderer';
import type { ArtifactGridEntry } from './ArtifactCollectionUIController';

const LOCKED_SLOT_ALPHA = 0.3;

export class ArtifactCollectionUIRenderer {
  async render(
    ctx: CanvasRenderingContext2D,
    slots: ArtifactGridEntry[]
  ): Promise<void> {
    for (const slot of slots) {
      if (!slot.isUnlocked) {
        ctx.save();
        ctx.globalAlpha *= LOCKED_SLOT_ALPHA;
      }

      await drawArtifactSlot({
        ctx,
        x: slot.x,
        y: slot.y,
        size: slot.size,
        iconKey: slot.artifact?.icon ?? undefined,
        isHovered: slot.isHovered,
        isSelected: slot.isSelected,
        isEmpty: !slot.artifact,
      });

      if (!slot.isUnlocked) {
        ctx.restore();
      }
    }
  }
}
