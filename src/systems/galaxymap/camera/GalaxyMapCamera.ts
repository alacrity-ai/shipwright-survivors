// src/systems/galaxymap/camera/camera.ts

import type { Vec3 } from '@/systems/galaxymap/webgl/vectorUtils';
import { vec3Create, vec3Subtract, vec3Add, vec3Scale, vec3Normalize } from '@/systems/galaxymap/webgl/vectorUtils';
import type { LocationDefinition } from '@/systems/galaxymap/types/LocationDefinition';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class GalaxyMapCamera {
  public readonly position: Vec3 = vec3Create();
  public readonly target: Vec3 = vec3Create();

  private readonly targetPosition: Vec3 = vec3Create();
  private readonly targetTarget: Vec3 = vec3Create();

  private isMoving: boolean = false;
  private moveSpeed: number = 0.08;

  constructor() {
    this.position[0] = 0;
    this.position[1] = 0;
    this.position[2] = 60;

    this.target[0] = 0;
    this.target[1] = 0;
    this.target[2] = 0;

    this.targetPosition.set(this.position);
    this.targetTarget.set(this.target);
  }

  public update(): void {
    if (!this.isMoving) return;
    let movementContinues = false;

    for (let i = 0; i < 3; i++) {
      const prev = this.position[i];
      this.position[i] = lerp(this.position[i], this.targetPosition[i], this.moveSpeed);
      this.target[i] = lerp(this.target[i], this.targetTarget[i], this.moveSpeed);

      if (Math.abs(this.position[i] - prev) > 0.001) {
        movementContinues = true;
      }
    }

    this.isMoving = movementContinues;
  }

  public focusOnLocation(location: LocationDefinition): void {
    const direction = vec3Create();
    vec3Subtract(direction, this.position, location.position); // From target to camera
    vec3Normalize(direction, direction);

    const desiredDistance = location.scale * 3.0;
    vec3Scale(direction, direction, desiredDistance);

    // Final camera position = planet position + scaled direction
    const newCameraPos = vec3Create();
    vec3Add(newCameraPos, location.position, direction);

    // Set target fields
    this.targetPosition.set(newCameraPos);
    this.targetTarget.set(location.position);

    this.isMoving = true;
  }

  public resetView(): void {
    this.targetPosition[0] = 0;
    this.targetPosition[1] = 0;
    this.targetPosition[2] = 60;

    this.targetTarget[0] = 0;
    this.targetTarget[1] = 0;
    this.targetTarget[2] = 0;

    this.isMoving = true;
  }

  public destroy(): void {
    // If any future cleanup is needed, define it here
    // e.g., detaching listeners or canceling transitions
  }
}
