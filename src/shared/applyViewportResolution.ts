// src/shared/applyViewportResolution.ts

import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

export function applyViewportResolution(): void {
  const settings = PlayerSettingsManager.getInstance();
  const width = settings.getViewportWidth();
  const height = settings.getViewportHeight();

  const root = document.getElementById('canvas-root');
  if (root) {
    root.style.width = `${width}px`;
    root.style.height = `${height}px`;
  }

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
}
