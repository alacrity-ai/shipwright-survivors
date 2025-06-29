// src/scenes/ship_selection/ShipSelectionMenu.ts

import { getUniformScaleFactor } from '@/config/view';
import { CanvasManager } from '@/core/CanvasManager';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawLabel } from '@/ui/primitives/UILabel';
import type { InputManager } from '@/core/InputManager';
import type { CollectableShipDefinition } from '@/game/ship/interfaces/CollectableShipDefinition';

import { PreviewShipComponent } from './components/PreviewShipComponent';
import { ShipSelectionGridComponent } from './components/ShipSelectionGridComponent';
import { EquippedArtifactsComponent } from './components/EquippedArtifactsComponent';
import { ShipDetailsComponent } from './components/ShipDetailsComponent';

export class ShipSelectionMenu {
  private canvasManager: CanvasManager;
  private inputManager: InputManager;

  // Layout
  private windowX: number;
  private windowY: number;
  private windowWidth: number;
  private windowHeight: number;

  // Owned components
  private previewComponent: PreviewShipComponent;
  private lastPreviewedFilepath: string | null = null;

  private gridComponent: ShipSelectionGridComponent;
  private artifactsComponent: EquippedArtifactsComponent;
  private detailsComponent: ShipDetailsComponent;

  constructor(inputManager: InputManager) {
    this.canvasManager = CanvasManager.getInstance();
    this.inputManager = inputManager;

    const scale = getUniformScaleFactor();
    const viewportWidth = this.canvasManager.getCanvas('ui').width;
    const viewportHeight = this.canvasManager.getCanvas('ui').height;

    this.windowWidth = 1000 * scale;
    this.windowHeight = 500 * scale;
    this.windowX = (viewportWidth / 2) - (this.windowWidth / 2);
    this.windowY = (viewportHeight / 2) - (this.windowHeight / 2);

    // Instantiate components
    this.previewComponent = new PreviewShipComponent();
    this.gridComponent = new ShipSelectionGridComponent(inputManager);
    this.artifactsComponent = new EquippedArtifactsComponent();
    this.detailsComponent = new ShipDetailsComponent();
  }

  getSelectedShip(): CollectableShipDefinition | null {
    return this.gridComponent.getSelectedShip();
  }

  update(dt: number): void {
    const selected = this.gridComponent.getSelectedShip();
    if (selected && selected.filepath !== this.lastPreviewedFilepath) {
      this.lastPreviewedFilepath = selected.filepath;
      this.previewComponent.setPreviewShip(selected);
      this.detailsComponent.setShip(selected);
    }

    this.previewComponent.update(dt);
    this.gridComponent.update();
    this.artifactsComponent.update();
  }

  render(uiCtx: CanvasRenderingContext2D, _overlayCtx: CanvasRenderingContext2D): void {
    const scale = getUniformScaleFactor();

    drawWindow({
      ctx: uiCtx,
      x: this.windowX,
      y: this.windowY,
      width: this.windowWidth,
      height: this.windowHeight,
      options: {
        alpha: 0.92,
        borderRadius: 12,
        borderColor: '#00ff33',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#001a00' },
            { offset: 1, color: '#000f00' }
          ]
        }
      }
    });

    // === Title ===
    drawLabel(
      uiCtx,
      this.windowX + this.windowWidth / 2,
      this.windowY - 40 * scale,
      'Choose Your Ship',
      {
        font: `${20 * scale}px monospace`,
        align: 'center',
        glow: true
      }
    );

    // === Preview Ship Name ===
    const selected = this.gridComponent.getSelectedShip();
    if (selected) {
      const centerX = this.windowX + this.windowWidth / 2;
      const previewTopY = this.windowY + 32 * scale; // Adjust to match actual preview component Y offset
      // Name
      drawLabel(
        uiCtx,
        centerX,
        previewTopY, // Draw label above preview
        selected.name,
        {
          font: `${18 * scale}px monospace`,
          align: 'center',
          glow: true
        }
      );
    }

    // === Components ===
    this.previewComponent.render(uiCtx);
    this.gridComponent.render(uiCtx);
    this.artifactsComponent.render(uiCtx);
    this.detailsComponent.render(uiCtx, this.windowX + this.windowWidth - (200 * scale), this.windowY + (32 * scale));
  }

  destroy(): void {
    this.previewComponent.destroy();
  }
}
