// src/rendering/sprites/registry/SpriteSheetManifest.ts

import type { SpriteSheetManifest as SpriteSheetManifestType } from '@/rendering/sprites/interfaces/SpriteSheetManifest';

export const DefaultSpriteSheetManifest: SpriteSheetManifestType = {
  keyboard: {
    path: '/assets/ui/buttons/keyboard.png',
    cols: 16,
    rows: 26,
    frameWidth: 16,
    frameHeight: 16,
  },
  mouse: {
    path: '/assets/ui/buttons/mouse.png',
    cols: 6,
    rows: 10,
    frameWidth: 16,
    frameHeight: 16,
  },
  controller_xbox: {
    path: '/assets/ui/buttons/controller_xbox.png',
    cols: 7,
    rows: 27,
    frameWidth: 16,
    frameHeight: 16,
  },
  controller_ps: {
    path: '/assets/ui/buttons/controller_ps.png',
    cols: 7,
    rows: 27,
    frameWidth: 16,
    frameHeight: 16,
  },
  sticks: {
    path: '/assets/ui/buttons/sticks.png',
    cols: 6,
    rows: 12,
    frameWidth: 16,
    frameHeight: 16,
  },
};
