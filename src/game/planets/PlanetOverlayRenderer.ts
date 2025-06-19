// src/game/planets/PlanetOverlayRenderer.ts

import type { Camera } from '@/core/Camera';
import { drawCRTText } from '@/ui/primitives/CRTText';
import { getUniformScaleFactor } from '@/config/view';

export class PlanetOverlayRenderer {
  constructor(
    private readonly name: string
  ) {}

  render(
    overlayCtx: CanvasRenderingContext2D,
    camera: Camera,
    inInteractionRange: boolean,
    isInteracting: boolean
  ): void {
    // === 2D Overlay ===
    if (inInteractionRange && !isInteracting) {
      const uiScale = getUniformScaleFactor();
      const screenCenterX = camera.getViewportWidth() / 2;
      const topOffsetY = 32 * uiScale;

      drawCRTText(overlayCtx, screenCenterX, topOffsetY, this.name, {
        font: `${uiScale * 24}px "Courier New", monospace`,
        align: 'center',
        baseline: 'top',
        glow: true,
        chromaticAberration: true,
      });

      drawCRTText(overlayCtx, screenCenterX, topOffsetY + (32 * uiScale), 'Open Communications: [C]', {
        font: `${uiScale * 16}px "Courier New", monospace`,
        align: 'center',
        baseline: 'top',
        glow: true,
        chromaticAberration: true
      });
    }
  }

  update(dt: number): void {
    // no-op
  }
}