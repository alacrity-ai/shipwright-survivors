// src/scenes/ship_selection/ShipSelectionMenu.ts

import { getUniformScaleFactor } from '@/config/view';
import { CanvasManager } from '@/core/CanvasManager';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawMasteryLevel } from '@/ui/primitives/UIMasteryBadge';
import { handleButtonInteraction, drawButton, type UIButton } from '@/ui/primitives/UIButton';

import type { NavPoint } from '@/core/input/interfaces/NavMap';
import type { InputManager } from '@/core/InputManager';
import type { CollectableShipDefinition } from '@/game/ship/interfaces/CollectableShipDefinition';

import { PreviewShipComponent } from './components/PreviewShipComponent';
import { ShipSelectionGridComponent } from './components/ShipSelectionGridComponent';
import { EquippedArtifactsComponent } from './components/EquippedArtifactsComponent';
import { ShipDetailsComponent } from './components/ShipDetailsComponent';
import { ShipSkillTreeUIController } from '@/game/ship/skills/ui/ShipSkillTreeUIController';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { PlayerShipSkillTreeManager } from '@/game/player/PlayerShipSkillTreeManager';
import { 
  initializeShipSkillTreeSpriteCache, 
  destroyShipSkillTreeSpriteCache 
} from '@/game/ship/skills/icons/StarterShipSkillIconSpriteCache';

const crtStyle = {
  borderRadius: 10,
  alpha: 0.85,
  borderColor: '#00ff00',
  textFont: `18px monospace`,
  backgroundGradient: {
    type: 'linear' as const,
    stops: [
      { offset: 0, color: '#002200' },
      { offset: 1, color: '#001500' }
    ]
  }
};

export class ShipSelectionMenu {
  private canvasManager: CanvasManager;
  private inputManager: InputManager;

  // Layout
  private windowX: number;
  private windowY: number;
  private windowWidth: number;
  private windowHeight: number;

  private colorLeftButton: UIButton;
  private colorRightButton: UIButton;

  // === Owned components
  // Ship preview
  private previewComponent: PreviewShipComponent;
  private lastPreviewedFilepath: string | null = null;
  // Ship selection grid
  private gridComponent: ShipSelectionGridComponent;
  // Ship Equippable Artifacts
  private artifactsComponent: EquippedArtifactsComponent;
  // Ship Details
  private detailsComponent: ShipDetailsComponent;
  // Ship Skill Tree:
  private skillTreeController: ShipSkillTreeUIController;

  constructor(inputManager: InputManager) {
    this.canvasManager = CanvasManager.getInstance();
    this.inputManager = inputManager;

    // Initialize caches
    initializeShipSkillTreeSpriteCache();

    const scale = getUniformScaleFactor();
    const viewportWidth = this.canvasManager.getCanvas('ui').width;
    const viewportHeight = this.canvasManager.getCanvas('ui').height;

    this.windowWidth = 1200 * scale;
    this.windowHeight = 560 * scale;
    this.windowX = (viewportWidth / 2) - (this.windowWidth / 2);
    this.windowY = (viewportHeight / 2) - (this.windowHeight / 2);

    // Initialize color buttons
    const arrowWidth = 24;
    const arrowHeight = 24;
    const labelWidth = 10 * scale;
    const spacing = 12 * scale;
    const totalWidth = arrowWidth + spacing + labelWidth + spacing + arrowWidth;

    const centerX = viewportWidth / 2;
    const baseX = centerX - totalWidth / 2;
    const baseY = this.windowY + this.windowHeight - (arrowHeight + 48 * scale);

    this.colorLeftButton = {
      x: baseX,
      y: baseY,
      width: arrowWidth,
      height: arrowHeight,
      label: '←',
      isHovered: false,
      wasHovered: false,
      onClick: () => {
        const collection = PlayerShipCollection.getInstance();
        collection.cycleSelectedColor(-1);
        this.previewComponent.updateColor();
      },
      style: {
        ...crtStyle,
        textFont: `18px monospace`
      }
    };

    this.colorRightButton = {
      x: baseX + arrowWidth + spacing + labelWidth + spacing,
      y: baseY,
      width: arrowWidth,
      height: arrowHeight,
      label: '→',
      isHovered: false,
      wasHovered: false,
      onClick: () => {
        const collection = PlayerShipCollection.getInstance();
        collection.cycleSelectedColor(1);
        this.previewComponent.updateColor();
      },
      style: {
        ...crtStyle,
        textFont: `18px monospace`
      }
    };

    // Skill Tree
    console.log('[ShipSelectionMenu] Initializing skill tree controller');
    this.skillTreeController = new ShipSkillTreeUIController(inputManager);

    // Compute and apply render bounds
    const skillTreeWidth = 360;
    const skillTreeHeight = 320;

    const skillTreeX1 = 880 * scale;
    const skillTreeY1 = 250 * scale;
    const skillTreeX2 = skillTreeX1 + skillTreeWidth;
    const skillTreeY2 = skillTreeY1 + skillTreeHeight;

    this.skillTreeController.setRenderBounds(
      skillTreeX1,
      skillTreeY1,
      skillTreeX2,
      skillTreeY2,
      0.5 * scale
    );

    // Instantiate components
    this.previewComponent = new PreviewShipComponent();
    this.gridComponent = new ShipSelectionGridComponent(inputManager);
    this.artifactsComponent = new EquippedArtifactsComponent();
    this.detailsComponent = new ShipDetailsComponent();

    // DEBUG: Log discovered ships
    const discoveredShips = PlayerShipCollection.getInstance().getDiscoveredShips();
    console.log('[ShipSelectionMenu] Discovered ships:', discoveredShips);
  } 

  getSelectedShip(): CollectableShipDefinition | null {
    return this.gridComponent.getSelectedShip();
  }

  public getSkillTreeNavPoints(): NavPoint[] {
    return this.skillTreeController.getNavPoints();
  }

  public cycleSelectedShip(direction: 1 | -1): void {
    this.gridComponent.cycleSelectedShip(direction);
  }

  update(dt: number): void {
    const selected = this.gridComponent.getSelectedShip();
    if (selected && selected.filepath !== this.lastPreviewedFilepath) {
      this.lastPreviewedFilepath = selected.filepath;
      this.previewComponent.setPreviewShip(selected);
      this.detailsComponent.setShip(selected);
      this.skillTreeController.setShip(selected);
    }

    if (selected) {
      this.skillTreeController.update(dt);
    }

    // Color button logic
    const { x: mouseX, y: mouseY } = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();
    const scale = getUniformScaleFactor();

    handleButtonInteraction(this.colorLeftButton, mouseX, mouseY, clicked, scale);
    handleButtonInteraction(this.colorRightButton, mouseX, mouseY, clicked, scale);

    // Update components
    // CALL UPDATE OF SHIP SKILL TREE CONTROLLER HERE
    this.previewComponent.update(dt);
    this.gridComponent.update(dt);
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

      // === Mastery Level
      const collection = PlayerShipCollection.getInstance();
      const skillManager = PlayerShipSkillTreeManager.getInstance();

      const masteryLevel = collection.getShipMasteryLevel(selected.name);
      const currentXp = collection.getShipExperience(selected.name);
      const xpForNext = collection.getExperienceForLevel(masteryLevel);
      const selectedCount = skillManager.getSelectedCount(selected.name);

      // Coordinates
      const labelY = previewTopY + (24 * scale);
      const pointsY = previewTopY + (44 * scale);
      const badgeRadius = 16 * scale;
      const badgeX = centerX - (128 * scale); // Offset left of label
      const labelX = badgeX + (32 * scale);  // Slight spacing right of badge

      // Draw badge
      drawMasteryLevel(uiCtx, badgeX, labelY + badgeRadius / 2, masteryLevel, scale);

      // Construct XP label
      let masteryLabel = `Mastery Level`;
      if (xpForNext > 0) {
        masteryLabel += `  (${currentXp} / ${xpForNext} XP)`;
      } else {
        masteryLabel += `  (MAXIMUM LEVEL)`;
      }

      // Draw label beside badge
      drawLabel(
        uiCtx,
        labelX,
        labelY,
        masteryLabel,
        {
          font: `${14}px monospace`,
          align: 'left',
          glow: false
        },
        scale
      );

      // Draw Points Spent / Allowed
      drawLabel(
        uiCtx,
        centerX,
        pointsY,
        `Points Assigned: ${selectedCount} / ${masteryLevel}`,
        {
          font: `${14}px monospace`,
          align: 'center',
          glow: false
        },
        scale
      );
    }

    // === Color Selector Buttons ===
    drawButton(uiCtx, this.colorLeftButton, scale);
    drawButton(uiCtx, this.colorRightButton, scale);

    // === Center Label ===
    const spacing = 36 * scale;
    const labelCenterX =
      this.colorRightButton.x + this.colorRightButton.width + spacing
    const labelCenterY = this.colorLeftButton.y + (this.colorLeftButton.height / 2);

    const color = PlayerShipCollection.getInstance().getSelectedColor();
    drawLabel(uiCtx, labelCenterX, labelCenterY, 'Body Color', {
      font: `${12 * scale}px monospace`,
      align: 'left',
      color: color || '#ffffff'
    });

    // === Components ===
    this.skillTreeController.render();
    this.previewComponent.render(uiCtx);
    this.gridComponent.render(uiCtx);
    this.artifactsComponent.render(uiCtx);
    this.detailsComponent.render(uiCtx, this.windowX + this.windowWidth - (200 * scale), this.windowY + (32 * scale));
  }

  getColorButtons(): [UIButton, UIButton] {
    return [this.colorLeftButton, this.colorRightButton];
  }

  getGridButtons(): {
    gridX: number;
    gridY: number;
    screenX: number;
    screenY: number;
    isEnabled: boolean;
  }[] {
    return this.gridComponent.getGridButtons();
  }

  destroy(): void {
    destroyShipSkillTreeSpriteCache();
    this.previewComponent.destroy();
  }
}
