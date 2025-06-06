// src/scenes/hub/passives_menu/PassiveMenuManager.ts

import type { InputManager } from '@/core/InputManager';
import type { PlayerPassiveManager } from '@/game/player/PlayerPassiveManager';
import type { PassiveId, PassiveTier } from '@/game/player/PlayerPassiveManager';

import { drawCRTText } from '@/ui/primitives/CRTText';
import { drawCRTButton, type UICRTButton } from '@/ui/primitives/CRTButton';

import { PassiveMetadata, PassiveCategoryLabels, PassiveCategory } from './types/Passives';

export class PassiveMenuManager {
  private scrollOffset = 0;
  private readonly scrollSpeed = 40;

  private isDraggingThumb = false;
  private thumbDragOffsetY = 0;

  private contentHeight = 0;

  private activeButtons: UICRTButton[] = [];

  constructor(
    private readonly inputManager: InputManager,
    private readonly passiveManager: PlayerPassiveManager,
    private readonly bounds: { x: number; y: number; width: number; height: number }
  ) {}

  update(): void {
    const scrollBarWidth = 28;
    const scrollButtonHeight = 24;
    const scrollBarX = this.bounds.x + this.bounds.width - scrollBarWidth;

    const maxScroll = Math.max(0, this.contentHeight - this.bounds.height);

    if (this.inputManager.wasScrollWheelDown() || this.inputManager.isKeyPressed('KeyS')) {
      this.scrollOffset = Math.min(this.scrollOffset + this.scrollSpeed, maxScroll);
    }

    if (this.inputManager.wasScrollWheelUp() || this.inputManager.isKeyPressed('KeyW')) {
      this.scrollOffset = Math.max(0, this.scrollOffset - this.scrollSpeed);
    }

    const { x: mouseX, y: mouseY } = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();
    const mouseDown = this.inputManager.isKeyPressed('MouseLeft');
    const mouseReleased = this.inputManager.wasKeyJustReleased('MouseLeft');
    const mousePressed = this.inputManager.wasKeyJustPressed('MouseLeft');

    const trackTop = this.bounds.y + scrollButtonHeight;
    const trackHeight = this.bounds.height - scrollButtonHeight * 2;

    const visibleRatio = this.bounds.height / Math.max(this.contentHeight, 1);
    const thumbHeight = Math.max(30, visibleRatio * trackHeight);
    const thumbX = scrollBarX + 2;
    const thumbY = trackTop + (this.scrollOffset / maxScroll) * (trackHeight - thumbHeight);

    const isOverThumb =
      mouseX >= thumbX &&
      mouseX <= thumbX + (scrollBarWidth - 4) &&
      mouseY >= thumbY &&
      mouseY <= thumbY + thumbHeight;

    if (mousePressed && isOverThumb) {
      this.isDraggingThumb = true;
      this.thumbDragOffsetY = mouseY - thumbY;
    }

    if (this.isDraggingThumb && mouseDown) {
      const relativeY = mouseY - this.bounds.y - scrollButtonHeight - this.thumbDragOffsetY;
      const scrollTrackSpan = trackHeight - thumbHeight;

      if (scrollTrackSpan > 0) {
        const rowHeight = 32;
        const rawMaxScroll = Math.max(0, this.contentHeight - this.bounds.height);
        const snappedMaxScroll = Math.round(rawMaxScroll / rowHeight) * rowHeight;

        const clamped = Math.max(0, Math.min(scrollTrackSpan, relativeY));
        const scrollRatio = clamped / scrollTrackSpan;
        const rawOffset = scrollRatio * snappedMaxScroll;

        const snappedOffset = Math.round(rawOffset / rowHeight) * rowHeight;
        this.scrollOffset = Math.min(snappedOffset, snappedMaxScroll);
      } else {
        this.scrollOffset = 0;
      }
    }

    if (mouseReleased) {
      this.isDraggingThumb = false;
    }

    // === Regular buttons ===
    for (const btn of this.activeButtons) {
      btn.isHovered =
        mouseX >= btn.x &&
        mouseX <= btn.x + btn.width &&
        mouseY >= btn.y &&
        mouseY <= btn.y + btn.height;

      if (btn.isHovered && clicked) {
        btn.onClick();
        break;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = this.bounds;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    let cursorY = y - this.scrollOffset;

    const paddingX = 32;
    const rowHeight = 28;
    const tierSpacing = 70;
    const tierOffsetX = x + 320;

    const scrollBarWidth = 28;
    const scrollButtonHeight = 24;
    const scrollBarX = x + width - scrollBarWidth;

    this.activeButtons = [];

    let passiveRowIndex = 0;

    for (const categoryKey of Object.keys(PassiveCategoryLabels) as PassiveCategory[]) {
      const categoryLabel = PassiveCategoryLabels[categoryKey];

      drawCRTText(ctx, x + paddingX, cursorY, categoryLabel.toUpperCase(), {
        font: '18px monospace',
        color: '#00ff00',
      });
      cursorY += rowHeight;

      for (const [id, meta] of Object.entries(PassiveMetadata)) {
        if (meta.category !== categoryKey) continue;

        const currentTier = this.passiveManager.getPassiveTier(id as PassiveId);

        drawCRTText(ctx, x + paddingX, cursorY, meta.label, {
          font: '15px monospace',
          color: '#ffffff',
        });

        let tierIndex = 0;
        for (const tierLevel of [1, 2, 3] as PassiveTier[]) {
          const value = meta.tiers[tierLevel];
          const label = `${value}${meta.unit ?? ''}`;
          const tx = tierOffsetX + tierIndex * tierSpacing;

          drawCRTText(ctx, tx, cursorY, label, {
            font: '15px monospace',
            color: currentTier !== null && tierLevel <= currentTier ? '#00ff41' : '#666666',
          });

          tierIndex++;
        }

        const nextTier: PassiveTier = ((currentTier ?? 0) + 1) as PassiveTier;
        const canUpgrade = nextTier <= 3 && this.passiveManager.canAfford(nextTier);

        let lastX = tierOffsetX + 3 * tierSpacing + 10;

        const isValidTier = nextTier <= 3;
        const upgradeCost = isValidTier ? this.passiveManager.getUpgradeCost(nextTier, currentTier) : 0;
        const canAfford = isValidTier && this.passiveManager.canAfford(nextTier);

        if (isValidTier) {
          const btn: UICRTButton = {
            x: lastX,
            y: cursorY - 2,
            width: 30,
            height: 20,
            label: '+',
            onClick: canAfford
              ? () => {
                  this.passiveManager.setPassiveTier(id as PassiveId, nextTier);
                }
              : () => {}, // noop if unaffordable
            style: {
              font: '14px monospace',
              backgroundColor: '#111111',
              borderColor: canAfford ? '#00ff00' : '#444444',
              textColor: canAfford ? '#00ff00' : '#666666',
              alpha: 0.8,
              glow: canAfford,
              chromaticAberration: canAfford,
            },
          };

          this.activeButtons.push(btn);
          drawCRTButton(ctx, btn);

          drawCRTText(ctx, btn.x + btn.width + 8, cursorY, `Cost: ${upgradeCost}`, {
            font: '13px monospace',
            color: canAfford ? '#00ff00' : '#666666',
          });

          lastX = btn.x + btn.width + 80;
        }

        if (passiveRowIndex === 0) {
          const points = this.passiveManager.getAvailablePoints();
          drawCRTText(ctx, lastX, cursorY, `Passive Licenses: ${points}`, {
            font: '14px monospace',
            color: '#00ff00',
          });
        }

        passiveRowIndex++;
        cursorY += rowHeight;
      }

      cursorY += 6;
    }

    // === Update content height and scroll offset ===
    this.contentHeight = cursorY - y;
    const maxScroll = Math.max(0, this.contentHeight - height);
    this.scrollOffset = Math.min(this.scrollOffset, maxScroll);

    ctx.restore(); // End clipping
    ctx.save();

    // === Scroll Buttons ===
    const upBtn: UICRTButton = {
      x: scrollBarX,
      y: y + 32,
      width: scrollBarWidth,
      height: scrollButtonHeight,
      label: '▲',
      onClick: () => {
        this.scrollOffset = Math.max(0, this.scrollOffset - this.scrollSpeed);
      },
      style: {
        font: '13px monospace',
        backgroundColor: '#001100',
        borderColor: '#00ff00',
        textColor: '#00ff00',
        alpha: 1.0,
        glow: true,
        chromaticAberration: true
      }
    };

    const downBtn: UICRTButton = {
      x: scrollBarX,
      y: y + height - scrollButtonHeight - 32,
      width: scrollBarWidth,
      height: scrollButtonHeight,
      label: '▼',
      onClick: () => {
        this.scrollOffset = Math.min(this.scrollOffset + this.scrollSpeed, maxScroll);
      },
      style: upBtn.style
    };

    this.activeButtons.push(upBtn, downBtn);
    drawCRTButton(ctx, upBtn);
    drawCRTButton(ctx, downBtn);

    // === Thumb ===
    const trackTop = y + scrollButtonHeight + 32;
    const trackHeight = height - scrollButtonHeight * 2 - 64;
    const visibleRatio = height / Math.max(this.contentHeight, 1);
    const thumbHeight = Math.max(30, visibleRatio * trackHeight);
    const thumbY = trackTop + (this.scrollOffset / maxScroll) * (trackHeight - thumbHeight);

    ctx.fillStyle = '#00ff00';
    ctx.globalAlpha = 0.3;
    ctx.fillRect(scrollBarX + 2, thumbY, scrollBarWidth - 4, thumbHeight);
    ctx.restore();
  }



}
