// src/game/ship/artifacts/ui/ArtifactEquipUIController.ts

import { PlayerArtifactsManager } from '@/game/player/PlayerArtifactsManager';
import { getUniformScaleFactor } from '@/config/view';
import { drawArtifactSlot } from './ArtifactSlotRenderer';
import { ArtifactTooltipRenderer } from './ArtifactTooltipRenderer';
import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import { drawLabel } from '@/ui/primitives/UILabel';
import { DEFAULT_CONFIG } from '@/config/ui';
import { reportArtifactsCollectionOpened } from '@/core/interfaces/events/ArtifactsCollectionReporter';

import { getArtifactById } from '@/game/ship/artifacts/registry/ArtifactRegistry';

import type { InputManager } from '@/core/InputManager';
import type { NavPoint } from '@/core/input/interfaces/NavMap';

import { audioManager } from '@/audio/Audio';

const SLOT_SIZE = 76;
const SLOT_SPACING = 26;
const SLOT_ORIGIN_X = 900;
const SLOT_ORIGIN_Y = 130;

interface EquipSlot {
  x: number;
  y: number;
  isHovered: boolean;
}

export class ArtifactEquipUIController {
  private inputManager: InputManager;
  private hoveredSlotIndex: number | null = null;

  private slots: EquipSlot[] = [];
  private shipName: string | null = null;

  private scaledSlotSize = SLOT_SIZE * getUniformScaleFactor();
  private scaledSlotSpacing = SLOT_SPACING * getUniformScaleFactor();
  private scaledOriginX = SLOT_ORIGIN_X * getUniformScaleFactor();
  private scaledOriginY = SLOT_ORIGIN_Y * getUniformScaleFactor();

  private tooltipRenderer = new ArtifactTooltipRenderer();

  constructor(inputManager: InputManager) {
    this.inputManager = inputManager;

    for (let i = 0; i < 3; i++) {
      const x = this.scaledOriginX + i * (this.scaledSlotSize + this.scaledSlotSpacing);
      const y = this.scaledOriginY;
      this.slots.push({ x, y, isHovered: false });
    }
  }

  public getNavPoints(): NavPoint[] {
    const points: NavPoint[] = [];

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      points.push({
        gridX: i,           // 0, 1, 2
        gridY: 0,           // Top row
        screenX: slot.x + this.scaledSlotSize / 2,
        screenY: slot.y + this.scaledSlotSize / 2,
        isEnabled: true     // Always allow selection
      });
    }

    return points;
  }

  setShipName(shipName: string): void {
    this.shipName = shipName;
  }

  update(dt: number): void {
    const mouse = this.inputManager.getMousePosition();
    const click = this.inputManager.wasMouseClicked();

    this.hoveredSlotIndex = null;

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      slot.isHovered =
        mouse.x >= slot.x &&
        mouse.x <= slot.x + this.scaledSlotSize &&
        mouse.y >= slot.y &&
        mouse.y <= slot.y + this.scaledSlotSize;

      if (slot.isHovered) {
        this.hoveredSlotIndex = i;

        if (click && this.shipName) {
          audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 3 });
          console.log(`[ArtifactEquipUI] Clicked slot ${i} for ship "${this.shipName}"`);
          reportArtifactsCollectionOpened(i as 0 | 1 | 2);
        }
      }
    }
  }

  async render(ctx: CanvasRenderingContext2D): Promise<void> {
    if (!this.shipName) return;

    const equipped = PlayerArtifactsManager.getInstance().getEquippedArtifacts(this.shipName);

    for (let i = 0; i < 3; i++) {
      const artifact = equipped[i];
      const iconKey = artifact ? getArtifactById(artifact)?.icon ?? undefined : undefined;
      await drawArtifactSlot({
        ctx,
        x: this.slots[i].x,
        y: this.slots[i].y,
        size: this.scaledSlotSize,
        rarity: artifact ? getArtifactById(artifact)?.rarity ?? 'common' : 'common',
        iconKey,
        isHovered: this.slots[i].isHovered,
        isSelected: false,
        isEmpty: !iconKey,
      });
    }

    // === Tooltip Rendering ===
    if (this.hoveredSlotIndex != null) {
      const artifactId = equipped[this.hoveredSlotIndex];
      const mouse = this.inputManager.getMousePosition();
      const uiScale = getUniformScaleFactor();

      if (artifactId) {
        this.tooltipRenderer.renderTooltip(artifactId, mouse.x, mouse.y, uiScale, 'left', null);
      } else {
        const device = InputDeviceTracker.getInstance().getLastUsed();
        const label = device === 'gamepad' ? 'Press (A) to Select Artifact' : 'Click to Select Artifact';

        this.renderEmptyTooltip(ctx, mouse.x, mouse.y, uiScale, label);
      }
    }
  }

  private renderEmptyTooltip(
    ctx: CanvasRenderingContext2D,
    anchorX: number,
    anchorY: number,
    uiScale: number,
    interactionHint: string
  ): void {
    const { blackColor, accentColor, hoverColor } = DEFAULT_CONFIG.general;

    uiScale *= 0.75;

    const boxWidth = 360 * uiScale;
    const boxHeight = 2 * 36 * uiScale + 2 * 24 * uiScale;

    const boxX = anchorX - (440 * uiScale);
    const boxY = anchorY - boxHeight / 2;

    // === Background ===
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = blackColor;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10 * uiScale);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // === Text ===
    let cursorY = boxY + 24 * uiScale;
    const labelX = boxX + 24 * uiScale;

    drawLabel(ctx, labelX, cursorY, 'No Artifact Equipped', {
      font: `${20}px monospace`,
      color: '#999999',
      glow: false
    }, uiScale);

    cursorY += 36 * uiScale;

    drawLabel(ctx, labelX, cursorY, interactionHint, {
      font: `${18}px monospace`,
      color: hoverColor,
      glow: false
    }, uiScale);
  }

  getHoveredSlotIndex(): number | null {
    return this.hoveredSlotIndex;
  }
}
