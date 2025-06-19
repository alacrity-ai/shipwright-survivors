// src/systems/ai/interfaces/CullabilityDelegate.ts

import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';

export interface CullabilityDelegate {
  setUncullable(controller: AIControllerSystem, uncullable: boolean): void;
  setCullable(controller: AIControllerSystem): void;
}
