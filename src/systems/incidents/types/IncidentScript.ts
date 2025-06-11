// src/systems/incidents/types/IncidentScript.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { IncidentRuntimeContext } from './IncidentRuntimeContext';

export interface IncidentScript {
  getId(): string;
  getWaveId(): number | undefined;
  onTrigger(): void;
  update(dt: number): void;
  render?(canvasManager: CanvasManager, dt: number): void;
  onComplete?(): void;
  destroy?(): void;
  isComplete(): boolean;
}

export type IncidentScriptConstructor = new (
  id: string,
  options: Record<string, any>,
  waveId: number | undefined,
  context: IncidentRuntimeContext
) => IncidentScript;
