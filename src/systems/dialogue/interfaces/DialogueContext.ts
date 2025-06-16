// src/systems/dialogue/interfaces/DialogueContext.ts
import type { InputManager } from '@/core/InputManager';
import type { Ship } from '@/game/ship/Ship';
import type { WaveSpawner } from '@/systems/wavespawner/WaveSpawner';
import type { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';

export interface DialogueContext {
  inputManager?: InputManager;
  playerShip?: Ship;
  waveSpawner?: WaveSpawner;
  coachMarkManager?: CoachMarkManager;
  // Extend with optional systems as needed
}
