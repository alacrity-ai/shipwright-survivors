// src/config/virtualResolution.ts

import { getViewportWidth, getViewportHeight } from './view';

export const VIRTUAL_WIDTH = 1280;
export const VIRTUAL_HEIGHT = 720;

export function scaleX(x: number): number {
  return x * getViewportWidth() / VIRTUAL_WIDTH;
}

export function scaleY(y: number): number {
  return y * getViewportHeight() / VIRTUAL_HEIGHT;
}

export function scaleRect(rect: { x: number; y: number; width: number; height: number }) {
  return {
    x: scaleX(rect.x),
    y: scaleY(rect.y),
    width: scaleX(rect.width),
    height: scaleY(rect.height),
  };
}
