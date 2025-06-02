// src/systems/dialogue/interfaces/DialogueContext.ts
import type { InputManager } from '@/core/InputManager';
import type { Ship } from '@/game/ship/Ship';
import type { WaveSpawner } from '@/systems/wavespawner/WaveSpawner';

export interface DialogueContext {
  inputManager?: InputManager;
  playerShip?: Ship;
  waveSpawner?: WaveSpawner;
  // Extend with optional systems as needed
}
