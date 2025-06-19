// src/shared/applyViewportResolution.ts

import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';

/**
 * Applies resolution and canvas sizing logic based on viewport and player settings.
 * Optionally invokes a callback after all resizes are completed.
 */
export function applyViewportResolution(
  canvasManager: CanvasManager | null = null,
  camera: Camera | null = null,
  onComplete?: () => void
): void {
  const settings = PlayerSettingsManager.getInstance();
  const width = settings.getViewportWidth();
  const height = settings.getViewportHeight();

  const canvasIds = [
    'background-canvas',
    'entity-canvas',
    'fx-canvas',
    'particles-canvas',
    'ui-canvas',
    'overlay-canvas',
    'dialogue-canvas',
  ];

  for (const id of canvasIds) {
    const canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
  }

  if (canvasManager) {
    canvasManager.resize();
  }

  if (camera) {
    camera.resize(width, height);
  }

  const root = document.getElementById('canvas-root');
  if (root) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const zoomX = viewportWidth / width;
    const zoomY = viewportHeight / height;
    const optimalZoom = Math.min(zoomX, zoomY);

    root.style.zoom = optimalZoom.toString();
    root.style.width = `${width}px`;
    root.style.height = `${height}px`;
    root.style.overflow = 'hidden';
  }

  // TODO: Deprecated
  // if (PlayerSettingsManager.getInstance().isLightingEnabled()) {
  //   if (LightingOrchestrator.hasInstance()) {
  //     LightingOrchestrator.getInstance().resizeLighting();
  //   }
  // }

  // Invoke callback after all resizing and zoom application
  if (onComplete) {
    onComplete();
  }
}
