// src/shared/applyViewportResolution.ts

import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { isElectron } from '@/shared/isElectron';

import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';

// Alternative approach: Calculate zoom based on screen dimensions
export function applyViewportResolution(
  canvasManager: CanvasManager | null = null,
  camera: Camera | null = null
): void {
  const settings = PlayerSettingsManager.getInstance();
  const width = settings.getViewportWidth();
  const height = settings.getViewportHeight();

  // === 1-4. Same canvas/manager/camera/electron logic as above ===
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

  // === 5. Screen-fit zoom calculation ===
  // This works
  // const root = document.getElementById('canvas-root');
  // if (root) {
  //   // Get available screen space
  //   const screenWidth = window.screen.availWidth;
  //   const screenHeight = window.screen.availHeight;
    
  //   // Calculate zoom to fit screen
  //   const zoomX = screenWidth / width;
  //   const zoomY = screenHeight / height;
  //   const optimalZoom = Math.min(zoomX, zoomY);
    
  //   // Apply zoom
  //   root.style.zoom = optimalZoom.toString();
  //   root.style.width = `${width}px`;
  //   root.style.height = `${height}px`;
  //   root.style.overflow = 'hidden';
  // }

  // === Solution 1: Use Viewport Dimensions Instead of Screen ===
  const root = document.getElementById('canvas-root');
  if (root) {
    // Use actual viewport dimensions instead of screen dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate zoom to fit viewport
    const zoomX = viewportWidth / width;
    const zoomY = viewportHeight / height;
    const optimalZoom = Math.min(zoomX, zoomY);
    
    // Apply zoom
    root.style.zoom = optimalZoom.toString();
    root.style.width = `${width}px`;
    root.style.height = `${height}px`;
    root.style.overflow = 'hidden';
  }
}