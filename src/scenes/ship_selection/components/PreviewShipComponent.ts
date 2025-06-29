// src/scenes/ship_selection/components/PreviewShipComponent.ts

import type { CollectableShipDefinition } from '@/game/ship/interfaces/CollectableShipDefinition';
import { createPreviewShip } from '@/game/ship/factories/previewShipFactory';
import { PreviewShip } from '@/game/ship/PreviewShip';
import { PreviewShipRendererGL } from '@/rendering/PreviewShipRenderer';
import { loadJson } from '@/shared/jsonLoader';
import { getAssetPath } from '@/shared/assetHelpers';
import { getUniformScaleFactor } from '@/config/view';

const DEFAULT_POSITION = { x: 0, y: 0 }; // Can be overridden if you want center alignment
const PREVIEW_SCALE = 2.00 * getUniformScaleFactor(); // Adjustable per layout fit

export class PreviewShipComponent {
  private renderer: PreviewShipRendererGL;
  private currentShip: PreviewShip | null = null;
  private currentShipId: string | null = null;

  constructor() {
    this.renderer = new PreviewShipRendererGL();
  }

  public async setPreviewShip(shipDef: CollectableShipDefinition): Promise<void> {
    if (shipDef.filepath === this.currentShipId) return;

    this.destroyPreviewShip();

    try {
      const jsonPath = getAssetPath(`assets/ships/${shipDef.filepath}.json`);
      const serialized = await loadJson(jsonPath);
      const previewShip = createPreviewShip(serialized, DEFAULT_POSITION.x, DEFAULT_POSITION.y, PREVIEW_SCALE);

      this.currentShip = previewShip;
      this.currentShipId = shipDef.filepath;
    } catch (err) {
      console.warn('[PreviewShipComponent] Failed to load ship JSON:', shipDef.filepath, err);
      this.currentShip = null;
    }
  }

  public update(deltaTime: number): void {
    // Spin or animation handled in renderer
  }

  public render(_ctx: CanvasRenderingContext2D): void {
    if (this.currentShip) {
      this.renderer.render(this.currentShip, 1 / 60); // Replace 1/60 with real delta if you track it
    }
  }

  public destroy(): void {
    this.renderer.destroy();
    this.destroyPreviewShip();
  }

  private destroyPreviewShip(): void {
    if (this.currentShip) {
      this.currentShip.destroyInstantly();
      this.currentShip = null;
      this.currentShipId = null;
    }
  }
}
