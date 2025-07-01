// src/game/ship/skills/ui/ShipSkillTreeUIController.ts

import { CanvasManager } from '@/core/CanvasManager';
import type { InputManager } from '@/core/InputManager';

import type { CollectableShipDefinition } from '@/game/ship/interfaces/CollectableShipDefinition';
import { getStarterShipSkillTree } from '@/game/ship/skills/registry/StarterShipSkillTreeRegistry';
import { PlayerShipSkillTreeManager } from '@/game/player/PlayerShipSkillTreeManager';
import { PlayerMetaCurrencyManager } from '@/game/player/PlayerMetaCurrencyManager';

import { audioManager } from '@/audio/Audio';

import { ShipSkillTreeUIRenderer } from '@/game/ship/skills/ui/ShipSkillTreeUIRenderer';
import { ShipSkillTreeTooltipRenderer } from '@/game/ship/skills/ui/ShipSkillTreeTooltipRenderer';

export class ShipSkillTreeUIController {
  private canvasManager: CanvasManager;
  private inputManager: InputManager;

  private uiRenderer: ShipSkillTreeUIRenderer;
  private tooltipRenderer: ShipSkillTreeTooltipRenderer;

  private currentShip: CollectableShipDefinition | null = null;
  private hoveredNodeId: string | null = null;

  // Layout bounds and scale (can be externally configured)
  private renderX1: number;
  private renderY1: number;
  private renderX2: number;
  private renderY2: number;
  private scale: number;

  constructor(inputManager: InputManager) {
    this.canvasManager = CanvasManager.getInstance();
    this.inputManager = inputManager;

    this.uiRenderer = new ShipSkillTreeUIRenderer();
    this.tooltipRenderer = new ShipSkillTreeTooltipRenderer();

    // Default layout, can be overridden later
    this.renderX1 = 100;
    this.renderY1 = 100;
    this.renderX2 = 360;
    this.renderY2 = 360;
    this.scale = 1.0;

    console.log('[ShipSkillTreeUIController] Initialized');
  }

  public setShip(def: CollectableShipDefinition): void {
    this.currentShip = def;
  }

  public getShip(): CollectableShipDefinition | null {
    return this.currentShip;
  }

  public setRenderBounds(x1: number, y1: number, x2: number, y2: number, scale: number): void {
    this.renderX1 = x1;
    this.renderY1 = y1;
    this.renderX2 = x2;
    this.renderY2 = y2;
    this.scale = scale;
  }

  public update(dt: number): void {
    if (!this.currentShip) return;

    const shipId = this.currentShip.name;
    const tree = getStarterShipSkillTree(shipId);
    if (!tree) return;

    const playerTreeManager = PlayerShipSkillTreeManager.getInstance();
    const metaManager = PlayerMetaCurrencyManager.getInstance();

    const mouse = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();
    const rightClicked = this.inputManager.wasRightClicked();

    this.hoveredNodeId = this.uiRenderer.getHoveredNodeId(
      mouse.x,
      mouse.y,
      tree,
      this.renderX1,
      this.renderY1,
      this.scale
    );

    if (!this.hoveredNodeId) return;

    const nodeId = this.hoveredNodeId;
    const positionedNode = tree.nodes.find(n => n.node.id === nodeId);
    if (!positionedNode) return;

    const node = positionedNode.node;
    const alreadyUnlocked = playerTreeManager.hasNode(shipId, nodeId);

    // === Right-click refund path ===
    if (rightClicked && alreadyUnlocked) {
      const refundAmount = playerTreeManager.refundNode(shipId, nodeId);

      if (refundAmount <= 0) {
        audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 8 });
        return;
      }

      metaManager.addMetaCurrency(refundAmount);
      console.log('[ShipSkillTreeUIController] Refunded node:', nodeId);
      audioManager.play('assets/sounds/sfx/ui/gamblewin_00.wav', 'sfx', { maxSimultaneous: 8 });
      return;
    }

    // === Left-click unlock path ===
    if (clicked) {
      if (alreadyUnlocked) {
        console.log('[ShipSkillTreeUIController] Already have node:', nodeId);
        audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 8 });
        return;
      }

      if (!metaManager.canAfford(node.cost)) {
        console.log(`[ShipSkillTreeUIController] Cannot afford node (cost: ${node.cost}), current: ${metaManager.getMetaCurrency()}`);
        audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 8 });
        return;
      }

      metaManager.subtractMetaCurrency(node.cost);
      const success = playerTreeManager.acquireNode(shipId, nodeId);

      if (!success) {
        console.log('[ShipSkillTreeUIController] Failed to acquire node:', nodeId);
        metaManager.addMetaCurrency(node.cost);
        audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 8 });
        return;
      }

      console.log('[ShipSkillTreeUIController] Acquired node:', nodeId);
      audioManager.play('assets/sounds/sfx/magic/levelup.wav', 'sfx', { maxSimultaneous: 8 });

      // TODO: animate node unlock, emit event
    }
  }

  public render(): void {
    if (!this.currentShip) return;

    const ctx = this.canvasManager.getContext('overlay');
    if (!ctx) return;

    const tree = getStarterShipSkillTree(this.currentShip.name);
    if (!tree) return;

    const selectedNodes = PlayerShipSkillTreeManager.getInstance().getSelectedNodeSet(
      this.currentShip.filepath
    );

    this.uiRenderer.renderTree(
      ctx,
      tree,
      selectedNodes,
      this.renderX1,
      this.renderY1,
      this.renderX2,
      this.renderY2,
      this.scale,
      this.hoveredNodeId,
      this.currentShip.name
    );

    if (this.hoveredNodeId) {
      const node = tree.nodes.find(n => n.node.id === this.hoveredNodeId);
      if (node) {
        const { x, y } = this.uiRenderer.getNodeScreenPosition(
          node,
          this.renderX1,
          this.renderY1,
          this.scale
        );

        this.tooltipRenderer.renderTooltip(node.node, x, y, this.scale);
      }
    }
  }
}
