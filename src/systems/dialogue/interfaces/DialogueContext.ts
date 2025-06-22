// src/systems/dialogue/interfaces/DialogueContext.ts
import type { InputManager } from '@/core/InputManager';
import type { Ship } from '@/game/ship/Ship';
import type { WaveOrchestrator } from '@/game/waves/orchestrator/WaveOrchestrator';
import type { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';

export interface DialogueContext {
  inputManager?: InputManager;
  playerShip?: Ship;
  waveOrchestrator?: WaveOrchestrator;
  coachMarkManager?: CoachMarkManager;
  // Extend with optional systems as needed
}
