// src/systems/cutscenes/CameraCutsceneController.ts

import type { Vec2 } from '@/shared/vectorUtils';
import type { IUpdatable } from '@/core/interfaces/types';
import type { Camera } from '@/core/Camera';

interface CameraCutsceneStep {
  duration: number;
  targetPosition: Vec2;
  targetZoom?: number;
  easing?: (t: number) => number;
}

export class CameraCutsceneController implements IUpdatable {
  private steps: CameraCutsceneStep[] = [];
  private currentStep = 0;
  private timer = 0;
  private isDone = false;

  constructor(private readonly camera: Camera) {}

  public addStep(step: CameraCutsceneStep): void {
    this.steps.push(step);
  }

  public update(dt: number): void {
    if (this.isDone || this.steps.length === 0) return;

    const step = this.steps[this.currentStep];
    this.timer += dt;
    const t = Math.min(this.timer / step.duration, 1);
    const eased = step.easing ? step.easing(t) : t;

    // interpolate
    this.camera.moveToward(step.targetPosition, eased);
    if (step.targetZoom != null) {
      this.camera.lerpZoom(step.targetZoom, eased);
    }

    if (t >= 1) {
      this.currentStep++;
      this.timer = 0;
      if (this.currentStep >= this.steps.length) {
        this.isDone = true;
      }
    }
  }
}
