// src/core/interfaces/types.ts

export interface IUpdatable {
  update(deltaTime: number): void;
  runWhilePaused?: boolean;
}

export interface IRenderable {
  render(deltaTime: number): void;
  runWhilePaused?: boolean;
}
