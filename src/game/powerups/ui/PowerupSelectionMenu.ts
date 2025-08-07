// src/game/powerups/ui/PowerupSelectionMenu.ts

import { DEFAULT_CONFIG, VEIL_CONFIG } from '@/config/ui';

import { getUniformScaleFactor } from '@/config/view';
import { CanvasManager } from '@/core/CanvasManager';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawLabel } from '@/ui/primitives/UILabel';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { resolvePowerupIconSprite } from '@/game/powerups/icons/PowerupIconSpriteCache';
import { PowerupRegistry } from '@/game/powerups/registry/PowerupRegistry';
import { PlayerPowerupManager } from '@/game/player/PlayerPowerupManager';
import { PlayerExperienceManager } from '@/game/player/PlayerExperienceManager';
import { isBranchNodeWithExclusion, getExcludedBranchLabels } from '@/game/powerups/utils/PowerupTreeUtils';
import { audioManager } from '@/audio/Audio';
import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';
import { CursorRenderer } from '@/rendering/CursorRenderer';
import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';
import { flags } from '@/game/player/PlayerFlagManager';

import { resolveImmediatePowerups } from '@/game/powerups/utils/resolveImmediatePowerups';

import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';
import { GlobalEventBus } from '@/core/EventBus';
import { cancelBlockQueueInteraction } from '@/core/interfaces/events/BlockQueueReporter';

import type { PowerupChannel } from '@/game/powerups/types/PowerupChannel';
import type { PowerupNodeDefinition } from '@/game/powerups/registry/PowerupNodeDefinition';
import type { InputManager } from '@/core/InputManager';
import type { Menu } from '@/ui/interfaces/Menu';

type MenuState = 'initializing' | 'slidingIn' | 'correcting' | 'open' | 'selectionMade' | 'slidingOut';

const BASE_WINDOW_X = 50;
const BASE_WINDOW_Y = 160;
const BASE_WINDOW_WIDTH = 640;
const BASE_WINDOW_HEIGHT = 420;
const BASE_ROW_HEIGHT = 110;

export class PowerupSelectionMenu implements Menu {
  private canvasManager: CanvasManager;

  private open = false;
  private selectedNodes: PowerupNodeDefinition[] = [];
  private hoveredIndex: number = -1;

  private levelUpsRemaining: number = 0;

  // Acquisition channel
  private currentChannel: PowerupChannel = 'experience';

  // State machine properties
  private state: MenuState = 'slidingIn';
  private transitionTimer: number = 0;
  private animatedX: number = 0;
  private selectedIndex: number = -1;
  private choice: PowerupNodeDefinition | null = null;

  // UI dimensions
  private windowX: number = BASE_WINDOW_X;
  private windowY: number = BASE_WINDOW_Y;
  private windowWidth: number = BASE_WINDOW_WIDTH;
  private windowHeight: number = BASE_WINDOW_HEIGHT;
  private rowHeight: number = BASE_ROW_HEIGHT;

  private SLIDE_IN_SPEED = 7000;
  private SLIDE_OUT_SPEED = 8000;
  private OVERSHOOT_DISTANCE = 200;
  private CORRECTION_SPEED = 1000;
  private SELECTION_ANIMATION_DURATION = 0.5;

  // Animation timers
  private labelColors: string[];
  private labelColorIndex: number = 0;
  private labelColorTimer: number = 0;
  private readonly LABEL_COLOR_INTERVAL = 0.1; // seconds per color step
  private hoverPulseTimer: number = 0;

  // Gamepad support
  private navManager: GamepadMenuInteractionManager;
  // private gamepadInputLatched = false; // No longer needed

  constructor(
    private readonly inputManager: InputManager,
    private readonly cursorRenderer: CursorRenderer,
    private readonly onSelect: (node: PowerupNodeDefinition) => void
  ) {
    this.canvasManager = CanvasManager.getInstance();
    this.navManager = new GamepadMenuInteractionManager(inputManager);

    this.labelColors = [
      '#ff4747ff', // red
      '#ff7f00', // orange
      '#ffff00', // yellow
      '#00ff00', // green
      '#00aeff', // blue
      '#af3fffff', // indigo
    ];

    GlobalEventBus.on('powerup:menu:open', this.handleOpenMenu);
  }

  private handleOpenMenu = ({ levelUps, channel }: { levelUps: number; channel: PowerupChannel }) => {
    this.openMenu(levelUps, channel);
  };

  openMenu(
    levelUps: number = 1,
    channel: PowerupChannel = 'experience' // NEW param
  ): void {
    flags.set('mission.intro-briefing.powerupMenuOpened');
    GlobalMenuReporter.getInstance().setMenuOpen('powerupSelectionMenu');
    cancelBlockQueueInteraction();

    this.levelUpsRemaining = levelUps;
    this.currentChannel = channel; // NEW assignment

    const scale = getUniformScaleFactor();
    const viewportWidth = this.canvasManager.getCanvas('overlay').width;

    this.windowWidth = BASE_WINDOW_WIDTH * scale;
    this.windowHeight = BASE_WINDOW_HEIGHT * scale;
    this.windowX = (viewportWidth / 2) - (this.windowWidth / 2);
    this.windowY = BASE_WINDOW_Y * scale;
    this.rowHeight = BASE_ROW_HEIGHT * scale;

    this.generateRandomSelection(); // will use currentChannel
    this.hoveredIndex = -1;
    this.selectedIndex = -1;
    this.open = true;
    this.state = 'initializing';
    this.transitionTimer = 0;
    this.animatedX = -this.windowWidth;

    this.updateNavPoints();
  }

  closeMenu(): void {
    GlobalMenuReporter.getInstance().setMenuClosed('powerupSelectionMenu');
    this.open = false;
    this.navManager.clearNavMap();
  }

  isOpen(): boolean {
    return this.open;
  }

  isBlocking(): boolean {
    return true;
  }

  private isUsingGamepad(): boolean {
    return InputDeviceTracker.getInstance().getLastUsed() === 'gamepad';
  }

  private updateNavPoints(): void {
    const scale = getUniformScaleFactor();
    const navPoints = this.selectedNodes.map((node, i) => {
      const rectX = this.windowX + (10 * scale);
      const rectY = this.windowY + (44 * scale) + i * (this.rowHeight + (10 * scale));
      const rectWidth = this.windowWidth - (20 * scale);
      const rectHeight = this.rowHeight;

      return {
        gridX: 0,
        gridY: i,
        screenX: rectX + rectWidth / 2,
        screenY: rectY + rectHeight / 2,
        isEnabled: true,
      };
    });

    if (this.isUsingGamepad()) {
      this.navManager.setNavMap(navPoints);
    } else {
      this.navManager.clearNavMap();
    }
  }

  update(dt: number): void {
    if (!this.open) return;

    // Update label color timer
    this.labelColorTimer += dt;
    if (this.labelColorTimer >= this.LABEL_COLOR_INTERVAL) {
      this.labelColorTimer -= this.LABEL_COLOR_INTERVAL;
      this.labelColorIndex++;
      if (this.labelColorIndex >= this.labelColors.length) {
        this.labelColorIndex = 0;
      }
    }

    this.hoverPulseTimer += dt;

    switch (this.state) {
      case 'initializing':
        audioManager.play('assets/sounds/sfx/magic/levelup.wav', 'sfx');
        this.state = 'slidingIn';
        break;

      case 'slidingIn':
        this.animatedX += dt * this.SLIDE_IN_SPEED; // pixels/sec
        if (this.animatedX >= this.windowX + this.OVERSHOOT_DISTANCE) {
          this.animatedX = this.windowX + this.OVERSHOOT_DISTANCE; // overshoot for bounce
          audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx');
          this.state = 'correcting';
        }
        break;

      case 'correcting':
        this.animatedX -= dt * this.CORRECTION_SPEED; // correct bounce
        if (this.animatedX <= this.windowX) {
          this.animatedX = this.windowX;
          this.state = 'open';
        }
        break;

      case 'open': {
        const scale = getUniformScaleFactor();

        // Always update navManager (even if map is empty)
        this.navManager.update(true);

        // Unified mouse/virtual-mouse interaction
        const mouse = this.inputManager.getMousePosition();
        if (!mouse) break;

        const { x, y } = mouse;
        const previousHovered = this.hoveredIndex;
        this.hoveredIndex = -1;

        for (let i = 0; i < this.selectedNodes.length; i++) {
          const rectX = this.animatedX + (10 * scale);
          const rectY = this.windowY + (44 * scale) + i * (this.rowHeight + (10 * scale));
          const rectWidth = this.windowWidth - (20 * scale);
          const rectHeight = this.rowHeight;

          const rect = { x: rectX, y: rectY, width: rectWidth, height: rectHeight };

          if (isMouseOverRect(x, y, rect, 1.0)) {
            if (previousHovered !== i) {
              audioManager.play('assets/sounds/sfx/ui/hover_00.wav', 'sfx', { maxSimultaneous: 14 });
              this.hoverPulseTimer = 0; // Reset pulse phase
            }

            this.hoveredIndex = i;

            if (this.inputManager.wasMouseClicked(false, true)) {
              const selected = this.selectedNodes[i];
              PlayerPowerupManager.getInstance().acquire(selected.id);
              resolveImmediatePowerups(selected.id);
              this.choice = selected;
              this.selectedIndex = i;
              this.state = 'selectionMade';
              this.transitionTimer = 0;
              audioManager.play('assets/sounds/sfx/pickups/rare_00.wav', 'sfx', { maxSimultaneous: 6 });
            }
            break;
          }
        }
        break;
      }

      case 'selectionMade':
        this.transitionTimer += dt;
        if (this.transitionTimer >= this.SELECTION_ANIMATION_DURATION) {
          if (this.levelUpsRemaining > 1) {
            // === Queue next selection round ===
            this.levelUpsRemaining--;
            this.choice = null;
            this.selectedIndex = -1;
            this.hoveredIndex = -1;
            this.transitionTimer = 0;
            this.generateRandomSelection();
            this.updateNavPoints();
            this.state = 'open';
          } else {
            // === Final level-up completed, exit ===
            this.state = 'slidingOut';
          }
        }
        break;

      case 'slidingOut':
        this.animatedX += dt * this.SLIDE_OUT_SPEED;
        if (this.animatedX >= this.canvasManager.getCanvas('overlay').width) {
          this.closeMenu();
          if (this.choice) {
            flags.set('mission.intro-briefing.powerupMenuClosed');
            this.onSelect(this.choice);
          }
        }
        break;
    }
  }

  render(): void {
    if (!this.open) return;

    const ctx = this.canvasManager.getContext('overlay');
    const scale = getUniformScaleFactor();

    // Calculate selection animation values
    let selectionProgress = 0;
    if (this.state === 'selectionMade') {
      // Create a more dramatic curve - peak at 60% of duration, then ease back to normal
      const normalizedTime = this.transitionTimer / this.SELECTION_ANIMATION_DURATION;
      if (normalizedTime <= 0.6) {
        // Ramp up to peak intensity
        selectionProgress = (normalizedTime / 0.6);
      } else {
        // Ease back down to normal for slide-out
        selectionProgress = 1 - ((normalizedTime - 0.6) / 0.4);
      }
      selectionProgress = Math.max(0, Math.min(1, selectionProgress));
    }

    // Apply selection glow effect during selectionMade state
    let windowAlpha = 0.9;
    let selectionGlow = 0;
    if (this.state === 'selectionMade') {
      // Pulse effect for selection
      const pulsePhase = (this.transitionTimer * 8) % (Math.PI * 2);
      selectionGlow = (Math.sin(pulsePhase) + 1) * 0.3;
      windowAlpha = 0.9 + selectionGlow * 0.1;
    }

    const config = this.getActiveConfig();

    drawWindow({
      ctx,
      x: this.animatedX,
      y: this.windowY,
      width: this.windowWidth,
      height: this.windowHeight,
      options: {
        ...config.window.options,
        alpha: windowAlpha,
      }
    });

    drawLabel(
      ctx,
      this.animatedX + this.windowWidth * 0.5,
      this.windowY + (12 * scale),
      'Choose Upgrade!',
      {
        color: this.getCurrentLabelColor(),
        font: `${18 * scale}px monospace`,
        align: 'center',
        glow: true
      },
    );

    // === Render Powerup Options ===
    for (let i = 0; i < this.selectedNodes.length; i++) {
      const node = this.selectedNodes[i];
      const isSelected = i === this.selectedIndex && this.state === 'selectionMade';
      const isUnselected = this.selectedIndex !== -1 && i !== this.selectedIndex && this.state === 'selectionMade';

      // Calculate scaling and fading effects
      let rowScale = 1.0;
      let rowAlpha = 1.0;
      
      if (isSelected) {
        // Selected item grows with smooth easing
        const easedProgress = selectionProgress * selectionProgress * (3 - 2 * selectionProgress); // smoothstep
        const growthFactor = 1 + (easedProgress * 0.25); // More subtle 25% growth
        const pulseFactor = 1 + (selectionGlow * 0.05); // Gentler pulse
        rowScale = growthFactor * pulseFactor;
      } else if (isUnselected) {
        // Unselected items shrink and fade more subtly
        const easedProgress = selectionProgress * selectionProgress * (3 - 2 * selectionProgress);
        rowScale = 1 - (easedProgress * 0.15); // Gentler 15% shrink
        rowAlpha = 1 - (easedProgress * 0.5); // Fade to 50% opacity
      }

      const rectX = this.animatedX + (10 * scale);
      const rectY = this.windowY + (44 * scale) + i * (this.rowHeight + (10 * scale));
      const rectWidth = this.windowWidth - (20 * scale);
      const rectHeight = this.rowHeight;

      // Calculate scaled dimensions and center offset
      const scaledWidth = rectWidth * rowScale;
      const scaledHeight = rectHeight * rowScale;
      const offsetX = (rectWidth - scaledWidth) / 2;
      const offsetY = (rectHeight - scaledHeight) / 2;

      ctx.save();
      ctx.globalAlpha = rowAlpha;

      // Hover background or selection highlight
      if (i === this.hoveredIndex && this.state === 'open') {
        const pulseAlpha = 0.15 + 0.15 * Math.sin(this.hoverPulseTimer * 6); // Pulses ~1Hz
        ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha.toFixed(3)})`;
        ctx.fillRect(rectX + offsetX, rectY + offsetY, scaledWidth, scaledHeight);
      } else if (isSelected) {
        // Selection made glow effect
        ctx.fillStyle = `rgba(0, 255, 0, ${0.3 + selectionGlow})`;
        ctx.fillRect(rectX + offsetX, rectY + offsetY, scaledWidth, scaledHeight);
      }

      // Scale icon and text based on row scale
      const iconSize = 32 * scale * rowScale;
      const iconOffset = (32 * scale - iconSize) / 2;
      
      // Icon
      const icon = resolvePowerupIconSprite(node.icon);
      ctx.drawImage(
        icon, 
        rectX + (8 * scale) + iconOffset + offsetX, 
        rectY + (8 * scale) + iconOffset + offsetY, 
        iconSize, 
        iconSize
      );

      // Label
      drawLabel(ctx, rectX + (70 * scale) + offsetX, rectY + (10 * scale) + offsetY, node.label, {
        font: `${16 * scale * rowScale}px monospace`,
        align: 'left',
        glow: true
      });

      // Description
      drawLabel(ctx, rectX + (70 * scale) + offsetX, rectY + (30 * scale) + offsetY, node.description, {
        font: `${12 * scale * rowScale}px monospace`,
        align: 'left',
        glow: false
      });

      // === Exclusive branch warning ===
      if (isBranchNodeWithExclusion(node)) {
        const excluded = getExcludedBranchLabels(node);
        const warning = `⚠️ Choosing this locks out: ${excluded.join(', ')}`;
        drawLabel(ctx, rectX + (70 * scale) + offsetX, rectY + (48 * scale) + offsetY, warning, {
          font: `${12 * scale * rowScale}px monospace`,
          align: 'left',
          glow: false,
          color: '#ff6666'
        });
      }

      ctx.restore();
    }
  }

  private generateRandomSelection(): void {
    const manager = PlayerPowerupManager.getInstance();
    const acquired = manager.getAcquiredSet();

    const playerLevel = PlayerExperienceManager.getInstance().getLevel();

    // Pass the stored channel through to the registry
    const candidates = PowerupRegistry.getEligiblePowerupNodes(
      acquired,
      playerLevel,
      this.currentChannel
    );

    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    this.selectedNodes = shuffled.slice(0, 3);
  }

  private getActiveConfig() {
    return this.currentChannel === 'veil' ? VEIL_CONFIG : DEFAULT_CONFIG;
  }

  private getCurrentLabelColor(): string {
    return this.labelColors[this.labelColorIndex];
  }

  public destroy(): void {
    GlobalEventBus.off('powerup:menu:open', this.handleOpenMenu);
  }
}
