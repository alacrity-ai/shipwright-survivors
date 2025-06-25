// src/scenes/hub/passives_menu/PassiveMenuManager.ts

import type { InputManager } from '@/core/InputManager';
import type { PlayerPassiveManager } from '@/game/player/PlayerPassiveManager';
import type { PassiveId, PassiveTier } from '@/game/player/PlayerPassiveManager';

import { getUniformScaleFactor } from '@/config/view'; // ADDED THIS IMPORT
import { drawCRTText } from '@/ui/primitives/CRTText';
import { drawCRTButton, type UICRTButton } from '@/ui/primitives/CRTButton';
import { audioManager } from '@/audio/Audio';

import { PassiveMetadata, PassiveCategoryLabels, PassiveCategory } from './types/Passives';

const CONTENT_BUFFER = Math.floor(900 * getUniformScaleFactor());

export class PassiveMenuManager {
  private scrollOffset = 0;
  private readonly baseScrollSpeed = 40;

  private isDraggingThumb = false;
  private thumbDragOffsetY = 0;

  private contentHeight = 0;

  private activeButtons: UICRTButton[] = [];
  private hoverSoundState: Map<string, boolean> = new Map();

  constructor(
    private readonly inputManager: InputManager,
    private readonly passiveManager: PlayerPassiveManager,
    private readonly bounds: { x: number; y: number; width: number; height: number }
  ) {}

  update(): void {
    const scale = getUniformScaleFactor();
    const scrollSpeed = Math.floor(this.baseScrollSpeed * scale);
    const scrollBarWidth = Math.floor(28 * scale);
    const scrollButtonHeight = Math.floor(24 * scale);
    const scrollBarX = this.bounds.x + this.bounds.width - scrollBarWidth;

    const maxScroll = Math.max(0, this.contentHeight - this.bounds.height);

    if (this.inputManager.wasScrollWheelDown() || this.inputManager.isKeyPressed('KeyS')) {
      this.scrollOffset = Math.min(this.scrollOffset + scrollSpeed, maxScroll);
    }

    if (this.inputManager.wasScrollWheelUp() || this.inputManager.isKeyPressed('KeyW')) {
      this.scrollOffset = Math.max(0, this.scrollOffset - scrollSpeed);
    }

    const { x: mouseX, y: mouseY } = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();
    const mouseDown = this.inputManager.isKeyPressed('MouseLeft');
    const mouseReleased = this.inputManager.wasKeyJustReleased('MouseLeft');
    const mousePressed = this.inputManager.wasKeyJustPressed('MouseLeft');

    const trackTop = this.bounds.y + scrollButtonHeight;
    const trackHeight = this.bounds.height - scrollButtonHeight * 2;

    const visibleRatio = this.bounds.height / Math.max(this.contentHeight, 1);
    const thumbHeight = Math.max(Math.floor(30 * scale), visibleRatio * trackHeight);
    const thumbX = scrollBarX + Math.floor(2 * scale);
    const thumbY = trackTop + (this.scrollOffset / maxScroll) * (trackHeight - thumbHeight);

    const isOverThumb =
      mouseX >= thumbX &&
      mouseX <= thumbX + (scrollBarWidth - Math.floor(4 * scale)) &&
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
        const rowHeight = Math.floor(32 * scale);
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
    const scale = getUniformScaleFactor();
    const { x, y, width, height } = this.bounds;

    const mouse = this.inputManager.getMousePosition();
    const { x: mouseX, y: mouseY } = mouse;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    let cursorY = y - this.scrollOffset;

    const paddingX = Math.floor(32 * scale);
    const rowHeight = Math.floor(28 * scale);
    const tierSpacing = Math.floor(70 * scale);
    const tierOffsetX = x + Math.floor(320 * scale);

    const scrollBarWidth = Math.floor(28 * scale);
    const scrollButtonHeight = Math.floor(24 * scale);
    const scrollBarX = x + width - scrollBarWidth;

    this.activeButtons = [];

    let passiveRowIndex = 0;

    const tierLevels: PassiveTier[] = [1, 2, 3, 4, 5];

    for (const categoryKey of Object.keys(PassiveCategoryLabels) as PassiveCategory[]) {
      const categoryLabel = PassiveCategoryLabels[categoryKey];

      drawCRTText(ctx, x + paddingX, cursorY, categoryLabel.toUpperCase(), {
        font: `${Math.floor(18 * scale)}px monospace`,
        color: '#00ff00',
      });
      cursorY += rowHeight;

      for (const [id, meta] of Object.entries(PassiveMetadata)) {
        if (meta.category !== categoryKey) continue;

        const currentTier = this.passiveManager.getPassiveTier(id as PassiveId);

        drawCRTText(ctx, x + paddingX, cursorY, meta.label, {
          font: `${Math.floor(15 * scale)}px monospace`,
          color: '#ffffff',
        });

        // Render all tier values
        tierLevels.forEach((tierLevel, tierIndex) => {
          const value = meta.tiers[tierLevel];
          if (value == null) return; // skip undefined tiers

          const label = `${value}${meta.unit ?? ''}`;
          const tx = tierOffsetX + tierIndex * tierSpacing;

          drawCRTText(ctx, tx, cursorY, label, {
            font: `${Math.floor(15 * scale)}px monospace`,
            color: currentTier !== null && tierLevel <= currentTier ? '#00ff41' : '#666666',
          });
        });

        const nextTier = ((currentTier ?? 0) + 1) as PassiveTier;
        const isValidTier = tierLevels.includes(nextTier);
        const canAfford = isValidTier && this.passiveManager.canAfford(nextTier);
        const upgradeCost = isValidTier ? this.passiveManager.getUpgradeCost(nextTier, currentTier) : 0;

        let lastX = tierOffsetX + tierLevels.length * tierSpacing + Math.floor(10 * scale);

        if (isValidTier && nextTier <= 5) {
          const btnWidth = Math.floor(30 * scale);
          const btnHeight = Math.floor(20 * scale);
          const btnX = lastX;
          const btnY = cursorY - Math.floor(2 * scale);

          const isHovered =
            mouseX >= btnX &&
            mouseX <= btnX + btnWidth &&
            mouseY >= btnY &&
            mouseY <= btnY + btnHeight;

          const buttonId = `upgrade:${id}`;
          const wasHovered = this.hoverSoundState.get(buttonId) ?? false;

          const onClick = () => {
            if (canAfford) {
              const success = this.passiveManager.setPassiveTier(id as PassiveId, nextTier);
              if (success) {
                audioManager.play('assets/sounds/sfx/ui/gamblewin_02.wav', 'sfx', { maxSimultaneous: 6 });
              }
            } else {
              audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 6 });
            }
          };

          const btn: UICRTButton = {
            x: btnX,
            y: btnY,
            width: btnWidth,
            height: btnHeight,
            label: '+',
            isHovered,
            onClick,
            style: {
              font: `${Math.floor(14 * scale)}px monospace`,
              backgroundColor: '#111111',
              borderColor: canAfford ? '#00ff00' : '#444444',
              textColor: canAfford ? '#00ff00' : '#666666',
              alpha: 0.8,
              glow: canAfford,
              chromaticAberration: canAfford,
            },
          };

          this.activeButtons.push(btn);

          if (btn.isHovered && !wasHovered) {
            audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 12 });
          }
          this.hoverSoundState.set(buttonId, btn.isHovered ?? false);

          drawCRTButton(ctx, btn);

          drawCRTText(ctx, btn.x + btn.width + Math.floor(8 * scale), cursorY, `Cost: ${upgradeCost}`, {
            font: `${Math.floor(13 * scale)}px monospace`,
            color: canAfford ? '#00ff00' : '#666666',
          });

          lastX = btn.x + btn.width + Math.floor(80 * scale);
        }

        if (currentTier === 5) {
          drawCRTText(ctx, lastX, cursorY, 'MAXED', {
            font: `${Math.floor(13 * scale)}px monospace`,
            color: '#00ff00',
          });
        }

        passiveRowIndex++;
        cursorY += rowHeight;
      }

      cursorY += Math.floor(6 * scale);
    }

    // === Update content height and scroll offset ===
    this.contentHeight = (cursorY - y) + CONTENT_BUFFER;
    const maxScroll = Math.max(0, this.contentHeight - height);
    this.scrollOffset = Math.min(this.scrollOffset, maxScroll);

    ctx.restore(); // End clipping
    ctx.save();

    // === Passive Points Label
    const points = this.passiveManager.getAvailablePoints();
    drawCRTText(ctx, 300 * scale, 46 * scale, `Available Cores: ${points}`, {
      font: `${Math.floor(16 * scale)}px monospace`,
      color: '#00ff00',
    });

    // === Scroll Buttons ===
    const scrollSpeed = Math.floor(this.baseScrollSpeed * scale);
    const upBtn: UICRTButton = {
      x: scrollBarX,
      y: y + Math.floor(32 * scale),
      width: scrollBarWidth,
      height: scrollButtonHeight,
      label: '▲',
      onClick: () => {
        this.scrollOffset = Math.max(0, this.scrollOffset - scrollSpeed);
      },
      style: {
        font: `${Math.floor(13 * scale)}px monospace`,
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
      y: y + height - scrollButtonHeight - Math.floor(32 * scale),
      width: scrollBarWidth,
      height: scrollButtonHeight,
      label: '▼',
      onClick: () => {
        this.scrollOffset = Math.min(this.scrollOffset + scrollSpeed, maxScroll);
      },
      style: upBtn.style
    };

    this.activeButtons.push(upBtn, downBtn);
    drawCRTButton(ctx, upBtn);
    drawCRTButton(ctx, downBtn);

    // === Thumb ===
    const trackTop = y + scrollButtonHeight + Math.floor(32 * scale);
    const trackHeight = height - scrollButtonHeight * 2 - Math.floor(64 * scale);
    const visibleRatio = height / Math.max(this.contentHeight, 1);
    const thumbHeight = Math.max(Math.floor(30 * scale), visibleRatio * trackHeight);
    const thumbY = trackTop + (this.scrollOffset / maxScroll) * (trackHeight - thumbHeight);

    ctx.fillStyle = '#00ff00';
    ctx.globalAlpha = 0.3;
    ctx.fillRect(scrollBarX + Math.floor(2 * scale), thumbY, scrollBarWidth - Math.floor(4 * scale), thumbHeight);
    ctx.restore();
  }
}