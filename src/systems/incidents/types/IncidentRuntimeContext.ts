// src/systems/incidents/types/IncidentRuntimeContext.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';
import type { InputManager } from '@/core/InputManager';
import type { Ship } from '@/game/ship/Ship';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import type { PopupMessageSystem } from '@/ui/PopupMessageSystem';

export interface IncidentRuntimeContext {
  canvasManager: CanvasManager;
  camera: Camera;
  inputManager: InputManager;
  aiOrchestrator: AIOrchestratorSystem;
  popupMessageSystem: PopupMessageSystem;
}
