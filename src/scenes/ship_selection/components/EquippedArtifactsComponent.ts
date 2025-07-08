// src/scenes/ship_selection/components/EquippedArtifactsComponent.ts

import { ArtifactEquipUIController } from '@/game/ship/artifacts/ui/ArtifactEquipUIController';
import type { InputManager } from '@/core/InputManager';
import { CanvasManager } from '@/core/CanvasManager';
import type { NavPoint } from '@/core/input/interfaces/NavMap';

export class EquippedArtifactsComponent {
  private inputManager: InputManager;
  private canvasManager: CanvasManager;
  private controller: ArtifactEquipUIController;

  constructor(inputManager: InputManager) {
    this.inputManager = inputManager;
    this.canvasManager = CanvasManager.getInstance();
    this.controller = new ArtifactEquipUIController(inputManager);
  }

  public getNavPoints(): NavPoint[] {
    return this.controller.getNavPoints();
  }

  public update(dt: number): void {
    this.controller.update(dt); // no dt pulse needed unless animation added
  }

  public async render(ctx: CanvasRenderingContext2D, selectedShipName?: string): Promise<void> {
    const selected = selectedShipName;
    if (selected) {
      this.controller.setShipName(selected);
      await this.controller.render(ctx);
    }
  }

  public wasSlotClicked(): boolean {
    return this.controller.getHoveredSlotIndex() != null && this.inputManager.wasMouseClicked();
  }
}
