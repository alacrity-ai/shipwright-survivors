// src/rendering/sprites/factories/AnimatedSpriteFactory.ts

import { AnimatedSprite } from '@/rendering/sprites/entities/AnimatedSprite';
import type { SpriteSheet } from '@/rendering/sprites/interfaces/SpriteSheet';
import type { SpriteAnimationRegistryType } from '@/rendering/sprites/interfaces/SpriteAnimationRegistryTypes';

export class AnimatedSpriteFactory {
  constructor(
    private readonly sheets: Record<string, SpriteSheet>,
    private readonly registry: SpriteAnimationRegistryType
  ) {}

  createAnimatedSprite(sheetId: string, animationId: string): AnimatedSprite {
    const sheet = this.sheets[sheetId];
    if (!sheet) {
      throw new Error(`[AnimatedSpriteFactory] Sheet not found: '${sheetId}'`);
    }

    const entry = this.registry[sheetId]?.[animationId];
    if (!entry) {
      throw new Error(`[AnimatedSpriteFactory] Animation entry not found in registry: '${sheetId}.${animationId}'`);
    }

    if (!entry.slices || entry.slices.length === 0) {
      throw new Error(`[AnimatedSpriteFactory] Animation '${sheetId}.${animationId}' must define non-empty 'slices'`);
    }

    const frames = sheet.getFramesAt(entry.slices);

    if (frames.length === 0 || frames.some(f => f == null)) {
      throw new Error(`[AnimatedSpriteFactory] Animation '${sheetId}.${animationId}' resolved to invalid or empty frame set`);
    }

    return new AnimatedSprite(frames, entry.speed);
  }
}
