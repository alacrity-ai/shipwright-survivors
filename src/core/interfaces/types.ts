// src/core/interfaces/types.ts

export interface IUpdatable {
  update(deltaTime: number): void;
}

export interface IRenderable {
  render(): void;
}
