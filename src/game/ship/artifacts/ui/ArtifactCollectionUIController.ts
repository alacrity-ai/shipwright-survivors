// src/game/ship/artifacts/ui/ArtifactCollectionUIController.ts

import type { InputManager } from '@/core/InputManager';
import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';
import { getAllArtifacts } from '@/game/ship/artifacts/registry/ArtifactRegistry';
import { PlayerArtifactsManager } from '@/game/player/PlayerArtifactsManager';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { ArtifactTooltipRenderer } from './ArtifactTooltipRenderer';
import { reportArtifactsCollectionClosed, reportArtifactEquipped } from '@/core/interfaces/events/ArtifactsCollectionReporter';
import { ArtifactCollectionUIRenderer } from './ArtifactCollectionUIRenderer';
import { CanvasManager } from '@/core/CanvasManager';
import { getUniformScaleFactor } from '@/config/view';

import type { NavPoint } from '@/core/input/interfaces/NavMap';

const CLOSE_BUTTON_GRID_Y = 5; // High enough to not conflict with 0–4 grid rows
const CLOSE_BUTTON_GRID_X = 0;

const COLUMNS = 8;
const ROWS = 5;
const SLOT_SIZE = 96;
const SLOT_SPACING = 16;
const GRID_ORIGIN_X = 220;
const GRID_ORIGIN_Y = 90;

export interface ArtifactGridEntry {
  artifact?: ArtifactDefinition;
  isUnlocked: boolean;
  x: number;
  y: number;
  size: number;
  isHovered: boolean;
  isSelected: boolean;
}

export class ArtifactCollectionUIController {
  private uiRenderer: ArtifactCollectionUIRenderer;

  private scale: number;

  private ctx: CanvasRenderingContext2D;
  private inputManager: InputManager;
  private slots: ArtifactGridEntry[] = [];
  private hoveredIndex: number | null = null;

  private tooltipRenderer = new ArtifactTooltipRenderer();

  constructor(inputManager: InputManager, private currentShipName: string, private slotIndex: 0 | 1 | 2) {
    const canvasManager = CanvasManager.getInstance();
    this.ctx = canvasManager.getContext('ui');
    this.scale = getUniformScaleFactor();
    
    this.uiRenderer = new ArtifactCollectionUIRenderer();
    this.inputManager = inputManager;
    this.initializeGrid();
  }

  private initializeGrid(): void {
    const registry = getAllArtifacts();
    const unlocked = new Set(PlayerArtifactsManager.getInstance().getUnlockedArtifacts());

    const tileSize = SLOT_SIZE * this.scale;
    const spacing = SLOT_SPACING * this.scale;

    this.slots = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        const index = row * COLUMNS + col;
        const artifact = registry[index];

        const x = GRID_ORIGIN_X * this.scale + col * (tileSize + spacing);
        const y = GRID_ORIGIN_Y * this.scale + row * (tileSize + spacing);

        this.slots.push({
          artifact,
          isUnlocked: artifact ? unlocked.has(artifact.id) : false,
          x,
          y,
          size: tileSize,
          isHovered: false,
          isSelected: false,
        });
      }
    }
  }

update(): void {
    const mouse = this.inputManager.getMousePosition();
    const click = this.inputManager.wasMouseClicked();
    this.hoveredIndex = null;

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const size = SLOT_SIZE * this.scale;

      slot.isHovered =
        mouse.x >= slot.x &&
        mouse.x <= slot.x + size &&
        mouse.y >= slot.y &&
        mouse.y <= slot.y + size;

      if (slot.isHovered) {
        this.hoveredIndex = i;

        if (click && slot.isUnlocked && slot.artifact) {
          const artifactId = slot.artifact.id;
          const manager = PlayerArtifactsManager.getInstance();

          // === Fully deduplicate artifact globally ===
          for (const [shipName, equipped] of manager.getAllEquippedArtifactEntries()) {
            for (let j = 0; j < equipped.length; j++) {
              if (equipped[j] === artifactId) {
                // Only unequip if it's not already in the intended target slot
                if (shipName !== this.currentShipName || j !== this.slotIndex) {
                  manager.unequipArtifact(shipName, j as 0 | 1 | 2);
                }
              }
            }
          }

          // === Equip to the selected slot on the current ship ===
          manager.equipArtifact(this.currentShipName, this.slotIndex, artifactId);
          PlayerShipCollection.getInstance().clearCachedModifiers();
          reportArtifactsCollectionClosed();
        }
      }
    }
  }

  render(): void {
    if (!this.ctx) return;

    this.uiRenderer.render(this.ctx, this.getSlots());
    this.renderTooltip();
  }

  renderTooltip(): void {
    if (this.hoveredIndex === null) return;

    const slot = this.slots[this.hoveredIndex];
    if (!slot.artifact) return;

    const mouse = this.inputManager.getMousePosition();
    const columnIndex = this.hoveredIndex % COLUMNS;
    const position: 'left' | 'right' = columnIndex >= 4 ? 'left' : 'right';

    if (slot.isUnlocked) {
      const manager = PlayerArtifactsManager.getInstance();
      const globallyEquippedShip = manager.findEquippedShipForArtifact(slot.artifact.id);
      const equippedOnOtherShip = globallyEquippedShip && globallyEquippedShip !== this.currentShipName
        ? globallyEquippedShip
        : null;

      this.tooltipRenderer.renderTooltip(
        slot.artifact.id,
        mouse.x,
        mouse.y,
        this.scale,
        position,
        equippedOnOtherShip
      );
    } else {
      this.tooltipRenderer.renderLockedTooltip(
        mouse.x,
        mouse.y,
        this.scale,
        position
      );
    }
  }

  setShipName(shipName: string): void {
    this.currentShipName = shipName;
  }

  getSlots(): ArtifactGridEntry[] {
    return this.slots;
  }

  getHoveredArtifact(): ArtifactDefinition | null {
    const slot = this.hoveredIndex != null ? this.slots[this.hoveredIndex] : null;
    return slot?.artifact ?? null;
  }

  getNavPoints(): NavPoint[] {
    const navPoints: NavPoint[] = [];
    const scale = this.scale;

    // Add nav points for each grid slot
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const artifact = slot.artifact;
      const isEnabled = slot.isUnlocked && !!artifact;

      const col = i % COLUMNS;
      const row = Math.floor(i / COLUMNS);

      navPoints.push({
        gridX: col,
        gridY: row,
        screenX: slot.x + slot.size / 2,
        screenY: slot.y + slot.size / 2,
        isEnabled,
      });
    }

    // Add nav point for Close button
    const ctx = CanvasManager.getInstance().getContext('ui');
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    const closeX = canvasWidth / 2 - (180 * scale);
    const closeY = canvasHeight - (58 * scale);
    const closeWidth = 360 * scale;
    const closeHeight = 40 * scale;

    navPoints.push({
      gridX: CLOSE_BUTTON_GRID_X,
      gridY: CLOSE_BUTTON_GRID_Y,
      screenX: closeX + closeWidth / 2,
      screenY: closeY + closeHeight / 2,
      isEnabled: true,
    });

    return navPoints;
  }
}
