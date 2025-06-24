// src/systems/incidents/helpers/randomAnywhere.ts

import { getWorldWidth, getWorldHeight } from '@/config/world';

export function randomAnywhere(): { x: number; y: number } {
  const x = Math.random() * getWorldWidth() - getWorldWidth() / 2;
  const y = Math.random() * getWorldHeight() - getWorldHeight() / 2;
  return { x, y };
}
