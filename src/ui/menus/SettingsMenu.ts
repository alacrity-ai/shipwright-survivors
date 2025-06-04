// src/ui/menus/SettingsMenu.ts

import type { Menu } from '@/ui/interfaces/Menu';
import type { InputManager } from '@/core/InputManager';
import { drawCheckbox, type UICheckbox } from '@/ui/primitives/UICheckBox';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { SaveGameManager } from '@/core/save/saveGameManager';

import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawButton, type UIButton } from '@/ui/primitives/UIButton';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawVolumeSlider, type VolumeSlider } from '@/ui/primitives/VolumeSlider';
import { audioManager } from '@/audio/Audio';

type SettingsTab = 'general' | 'volume';

export class SettingsMenu implements Menu {
  private inputManager: InputManager;
  private activeTab: SettingsTab = 'general';
  private open = false;

  private volumeLabels = ['Master Volume', 'Music Volume', 'Sound Effects', 'Dialogue Volume'];
  private closeButton: UIButton;
  private volumeSliders: VolumeSlider[];

  private particleCheckbox: UICheckbox;
  private lightingCheckbox: UICheckbox;
  private collisionsCheckbox: UICheckbox;

  constructor(inputManager: InputManager) {
    this.inputManager = inputManager;

    this.closeButton = {
      x: 400,
      y: 340,
      width: 120,
      height: 40,
      label: 'Close',
      onClick: () => this.closeMenu(),
      style: {
        borderRadius: 10,
        alpha: 0.8,
        borderColor: '#00ff00',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#002200' },
            { offset: 1, color: '#001500' }
          ]
        }
      }
    };

    this.volumeSliders = [
      {
        x: 300,
        y: 150,
        width: 120,
        height: 12,
        value: audioManager.getMasterVolume(),
        onChange: v => audioManager.setMasterVolume(v)
      },
      {
        x: 300,
        y: 190,
        width: 120,
        height: 12,
        value: audioManager.getChannelVolume('music'),
        onChange: v => audioManager.setChannelVolume('music', v)
      },
      {
        x: 300,
        y: 230,
        width: 120,
        height: 12,
        value: audioManager.getChannelVolume('sfx'),
        onChange: v => audioManager.setChannelVolume('sfx', v)
      },
      {
        x: 300,
        y: 270,
        width: 120,
        height: 12,
        value: audioManager.getChannelVolume('dialogue'),
        onChange: v => audioManager.setChannelVolume('dialogue', v)
      }
    ];

    const settings = PlayerSettingsManager.getInstance();

    this.particleCheckbox = {
      x: 160,
      y: 160,
      size: 14,
      label: 'Particles Enabled',
      checked: settings.isParticlesEnabled(),
      onToggle: (val) => {
        this.particleCheckbox.checked = val;
        settings.setParticlesEnabled(val);
        SaveGameManager.getInstance().saveSettings();
      }
    };

    this.lightingCheckbox = {
      x: 160,
      y: 200,
      size: 14,
      label: 'Lighting Enabled',
      checked: settings.isLightingEnabled(),
      onToggle: (val) => {
        this.lightingCheckbox.checked = val;
        settings.setLightingEnabled(val);
        SaveGameManager.getInstance().saveSettings();
      }
    };

    this.collisionsCheckbox = {
      x: 160,
      y: 240,
      size: 14,
      label: 'Collisions Enabled',
      checked: settings.isCollisionsEnabled(),
      onToggle: (val) => {
        this.collisionsCheckbox.checked = val;
        settings.setCollisionsEnabled(val);
        SaveGameManager.getInstance().saveSettings();
      }
    };
  }

  update(): void {
    const mouse = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasLeftClicked?.();
    const held = this.inputManager.isMouseLeftPressed?.();
    const { x, y } = mouse;

    // === Tab click logic ===
    if (clicked) {
      if (x >= 140 && x <= 240 && y >= 90 && y <= 130) {
        this.activeTab = 'general';
      } else if (x >= 260 && x <= 360 && y >= 90 && y <= 130) {
        this.activeTab = 'volume';
      }
    }

    if (this.activeTab === 'general') {
      for (const cb of [this.particleCheckbox, this.lightingCheckbox, this.collisionsCheckbox]) {
        const within = (
          x >= cb.x && x <= cb.x + cb.size &&
          y >= cb.y && y <= cb.y + cb.size
        );
        cb.isHovered = within;
        if (clicked && within) {
          cb.onToggle(!cb.checked);
        }
      }
    }

    // === Volume slider interactivity
    if (this.activeTab === 'volume') {
      for (const slider of this.volumeSliders) {
        const within =
          x >= slider.x && x <= slider.x + slider.width &&
          y >= slider.y && y <= slider.y + slider.height;

        slider.isHovered = within;

        if (held && within) {
          const raw = (x - slider.x) / slider.width;
          const clamped = Math.min(1, Math.max(0, raw));
          slider.value = clamped;
          slider.onChange(clamped);
          slider.isDragging = true;
        } else if (!held) {
          slider.isDragging = false;
        }
      }
    }

    // === Close button hover
    const btn = this.closeButton;
    btn.isHovered = (
      x >= btn.x && x <= btn.x + btn.width &&
      y >= btn.y && y <= btn.y + btn.height
    );

    if (clicked && btn.isHovered) {
      btn.onClick();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawWindow({
      ctx,
      x: 120,
      y: 80,
      width: 440,
      height: 320,
      options: {
        alpha: 0.6,
        borderRadius: 12,
        borderColor: '#00ff00',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#002200' },
            { offset: 1, color: '#001500' }
          ]
        }
      }
    });

    // === Tab Labels ===
    drawLabel(ctx, 190, 100, 'General', {
      font: '16px monospace',
      align: 'center',
      color: this.activeTab === 'general' ? '#6f6' : '#888'
    });

    drawLabel(ctx, 310, 100, 'Volume', {
      font: '16px monospace',
      align: 'center',
      color: this.activeTab === 'volume' ? '#6f6' : '#888'
    });

    if (this.activeTab === 'general') {
      drawCheckbox(ctx, this.particleCheckbox);
      drawCheckbox(ctx, this.lightingCheckbox);
      drawCheckbox(ctx, this.collisionsCheckbox);
    } else if (this.activeTab === 'volume') {
      for (let i = 0; i < this.volumeSliders.length; i++) {
        const slider = this.volumeSliders[i];
        const label = this.volumeLabels[i];

        drawLabel(ctx, slider.x - 25, slider.y, label, {
          font: '12px monospace',
          color: '#ccc',
          align: 'right'
        });

        drawVolumeSlider(ctx, slider);
      }
    }

    drawButton(ctx, this.closeButton);
  }

  isOpen(): boolean {
    return this.open;
  }

  openMenu(): void {
    this.open = true;
  }

  closeMenu(): void {
    this.open = false;
  }

  isBlocking(): boolean {
    return true;
  }
}
