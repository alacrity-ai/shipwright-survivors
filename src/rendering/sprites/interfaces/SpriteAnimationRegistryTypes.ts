// src/rendering/sprites/interfaces/SpriteAnimationRegistryTypes.ts

export interface SpriteAnimationDefinition {
  slices: [number, number][]; // [col, row] pairs
  speed: number;
}

export type SpriteAnimationRegistryType = {
  [sheetId: string]: {
    [animationId: string]: SpriteAnimationDefinition;
  };
};
