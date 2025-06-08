// src/ui/menus/SettingsMenu.ts

import type { Menu } from '@/ui/interfaces/Menu';
import type { InputManager } from '@/core/InputManager';
import type { MenuManager } from '@/ui/MenuManager';
import type { AudioChannel } from '@/audio/AudioManager';
import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';

import { drawCheckbox, type UICheckbox } from '@/ui/primitives/UICheckBox';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { SaveGameManager } from '@/core/save/saveGameManager';
import { applyViewportResolution } from '@/shared/applyViewportResolution';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { getUIScale } from '@/ui/menus/helpers/getUIScale';
import { getDropdownHoverInfo } from '@/ui/menus/helpers/getDropdownHoverInfo';

import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawButton, type UIButton } from '@/ui/primitives/UIButton';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawVolumeSlider, type VolumeSlider } from '@/ui/primitives/VolumeSlider';
import { drawCRTDropDown, CRTDropDown } from '@/ui/primitives/CRTDropDown';
import { audioManager } from '@/audio/Audio';

type SettingsTab = 'display' | 'volume';

type VolumeControlDef =
  | { kind: 'master' }
  | { kind: 'channel'; channel: AudioChannel };

const volumeDefs: VolumeControlDef[] = [
  { kind: 'master' },
  { kind: 'channel', channel: 'music' },
  { kind: 'channel', channel: 'sfx' },
  { kind: 'channel', channel: 'dialogue' },
];

export class SettingsMenu implements Menu {
  private inputManager: InputManager;
  private menuManager: MenuManager;
  private canvasManager: CanvasManager;
  private camera: Camera;
  private activeTab: SettingsTab = 'display';
  private open = false;

  private volumeLabels = ['Master Volume', 'Music Volume', 'Sound Effects', 'Dialogue Volume'];

  private closeButton: UIButton | null = null;
  private volumeSliders: VolumeSlider[] = [];

  private particleCheckbox: UICheckbox | null = null;
  private lightingCheckbox: UICheckbox | null = null;
  private collisionsCheckbox: UICheckbox | null = null;

  private resolutionDropdown: CRTDropDown | null = null;

  // Scalable UI Size Dimensions
  // Scaled against getUIScale()
  private windowX = 120;
  private windowY = 80;
  private windowHeight = 460;
  private windowWidth = 440;

  private headerStartY = 20;
  private headerStartX = 80;
  private headerHeight = 40;
  private headerItemWidth = 100;
  private headerHorizontalPadding = 16;

  private buttonWidth = 120;
  private buttonHeight = 40;
  private sliderWidth = 120;
  private sliderHeight = 12;
  private dropdownWidth = 120;
  private dropdownHeight = 28;
  private checkboxSize = 14;

  private itemVerticalSpacing = 40;

  private margin = 20;

  constructor(inputManager: InputManager, menuManager: MenuManager, canvasManager: CanvasManager, camera: Camera) {
    this.inputManager = inputManager;
    this.menuManager = menuManager;
    this.canvasManager = canvasManager;
    this.camera = camera;

    // Initialize UI elements
    this.initialize();
  }

  initialize(): void {
    const settings = PlayerSettingsManager.getInstance();

    const uiScale = getUIScale();
    const scaledMargin = this.margin * uiScale;
    const scaledHeaderHeight = this.headerHeight * uiScale;
    const scaledItemVerticalSpacing = this.itemVerticalSpacing * uiScale;
    const scaledWindowHeight = this.windowHeight * uiScale;
    const scaledWindowWidth = this.windowWidth * uiScale;
    const scaledButtonWidth = this.buttonWidth * uiScale;
    const scaledButtonHeight = this.buttonHeight * uiScale;

    const baseX = 160;
    const baseY = this.windowY + scaledMargin + scaledHeaderHeight;

    // Close button on Bottom right of window
    // The buttons origin is its center
    this.closeButton = {
      x: scaledWindowWidth - scaledButtonWidth / 2 - scaledMargin,
      y: scaledWindowHeight - scaledButtonHeight / 2 - scaledMargin,
      width: this.buttonWidth,
      height: this.buttonHeight,
      label: 'Close',
      onClick: () => {
        const pauseMenu = this.menuManager.getMenu('pauseMenu');
        if (pauseMenu) this.menuManager.transition(pauseMenu);
      },
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

    /* == UI Elements all in same column starting in top left of window 
    == (Position accounting for margin and tabs bar) */

    // == Volume Tab
    // Volume sliders are top most item in column in their tab
    this.volumeSliders = volumeDefs.map((def, i) => ({
      x: baseX,
      y: baseY + i * scaledItemVerticalSpacing,
      width: this.sliderWidth,
      height: this.sliderHeight,
      value:
        def.kind === 'master'
          ? audioManager.getMasterVolume()
          : audioManager.getChannelVolume(def.channel),
      onChange: (v: number) => {
        if (def.kind === 'master') {
          audioManager.setMasterVolume(v);
        } else {
          audioManager.setChannelVolume(def.channel, v);
        }
      },
    }));

    // == Display Tab
    // Particle Checkbox is (first) top most item in column in its tab
    this.particleCheckbox = {
      x: baseX,
      y: baseY,
      size: this.checkboxSize,
      label: 'Particles Enabled',
      checked: settings.isParticlesEnabled(),
      onToggle: (val) => {
        this.particleCheckbox!.checked = val;
        settings.setParticlesEnabled(val);
        SaveGameManager.getInstance().saveSettings();
      }
    };

    this.lightingCheckbox = {
      x: baseX,
      y: baseY + scaledItemVerticalSpacing,
      size: this.checkboxSize,
      label: 'Lighting Enabled',
      checked: settings.isLightingEnabled(),
      onToggle: (val) => {
        this.lightingCheckbox!.checked = val;
        settings.setLightingEnabled(val);
        SaveGameManager.getInstance().saveSettings();
      }
    };

    this.collisionsCheckbox = {
      x: baseX,
      y: baseY + scaledItemVerticalSpacing * 2,
      size: this.checkboxSize,
      label: 'Collisions Enabled',
      checked: settings.isCollisionsEnabled(),
      onToggle: (val) => {
        this.collisionsCheckbox!.checked = val;
        settings.setCollisionsEnabled(val);
        SaveGameManager.getInstance().saveSettings();
      }
    };

    const currentRes = `${settings.getViewportWidth()}x${settings.getViewportHeight()}`;

    const resolutionItems = [
      { label: '1920x1080', value: '1920x1080' },
      { label: '1920x1200', value: '1920x1200' },
      { label: '2560x1440', value: '2560x1440' },
      { label: '3840x2160', value: '3840x2160' },
    ];

    this.resolutionDropdown = {
      x: baseX,
      y: baseY + scaledItemVerticalSpacing * 3,
      width: this.dropdownWidth,
      height: this.dropdownHeight,
      items: resolutionItems,
      selectedIndex: resolutionItems.findIndex(item => item.value === currentRes) || 0,
      isOpen: false,
      onSelect: (item) => {
        const [wStr, hStr] = item.value.split('x');
        settings.setViewportWidth(parseInt(wStr, 10));
        settings.setViewportHeight(parseInt(hStr, 10));
        applyViewportResolution(this.canvasManager, this.camera);
        SaveGameManager.getInstance().saveSettings();
        this.initialize();
      },
      style: {
        backgroundColor: '#001100',
        borderColor: '#00ff41',
        textColor: '#00ff41',
        glow: true,
        chromaticAberration: true,
        alpha: 1.0,
      }
    };
  }

  update(): void {
    const mouse = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasLeftClicked?.();
    const held = this.inputManager.isMouseLeftPressed?.();
    const scale = getUIScale();

    const scaledHeaderItemWidth = this.headerItemWidth * scale;
    const scaledHeaderHorizontalPadding = this.headerHorizontalPadding * scale;

    // === Tab click logic ===
    if (clicked) {
      if (
        isMouseOverRect(
          mouse.x,
          mouse.y,
          {
            x: this.headerStartX + this.windowX,
            y: this.headerStartY + this.windowY,
            width: this.headerItemWidth,
            height: this.headerHeight,
          },
          scale
        )
      ) {
        this.activeTab = 'display';
      } else if (
        isMouseOverRect(
          mouse.x,
          mouse.y,
          {
            x: this.headerStartX + this.windowX + scaledHeaderItemWidth + scaledHeaderHorizontalPadding,
            y: this.headerStartY + this.windowY,
            width: this.headerItemWidth,
            height: this.headerHeight,
          },
          scale
        )
      ) {
        this.activeTab = 'volume';
      }
    }

    // === Display tab ===
    if (this.activeTab === 'display') {
      for (const cb of [this.particleCheckbox, this.lightingCheckbox, this.collisionsCheckbox]) {
        if (!cb) continue;
        const rect = { x: cb.x, y: cb.y, width: cb.size, height: cb.size };
        cb.isHovered = isMouseOverRect(mouse.x, mouse.y, rect, scale);
        if (clicked && cb.isHovered) {
          cb.onToggle(!cb.checked);
        }
      }
    }

    // === Volume tab ===
    if (this.activeTab === 'volume') {
      for (const slider of this.volumeSliders) {
        const rect = { x: slider.x, y: slider.y, width: slider.width, height: slider.height };
        slider.isHovered = isMouseOverRect(mouse.x, mouse.y, rect, scale);

        if (held && slider.isHovered) {
          // Correct: positions unscaled, dimensions scaled
          const relativeX = mouse.x - slider.x;
          const clamped = Math.min(1, Math.max(0, relativeX / (slider.width * scale)));
          slider.value = clamped;
          slider.onChange(clamped);
          slider.isDragging = true;
        } else if (!held) {
          slider.isDragging = false;
        }
      }
    }

    // === Resolution dropdown ===
    const dd = this.resolutionDropdown;
    if (dd) {
      const { isHovered, hoverIndex } = getDropdownHoverInfo(dd, mouse, scale);
      dd.isHovered = isHovered;
      dd.hoverIndex = hoverIndex;

      if (clicked && isHovered && hoverIndex === undefined) {
        dd.isOpen = !dd.isOpen;
      }

      if (dd.isOpen && typeof hoverIndex === 'number') {
        if (clicked) {
          dd.selectedIndex = hoverIndex;
          dd.isOpen = false;
          dd.onSelect?.(dd.items[hoverIndex]);
        }
      }
    }

    // === Close button ===
    const btn = this.closeButton;
    if (btn) {
      const rect = { x: btn.x, y: btn.y, width: btn.width, height: btn.height };
      btn.isHovered = isMouseOverRect(mouse.x, mouse.y, rect, scale);

      if (clicked && btn.isHovered) {
        btn.onClick();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const scale = getUIScale();

    const scaledHeaderItemWidth = this.headerItemWidth * scale;
    const scaledHeaderHorizontalPadding = this.headerHorizontalPadding * scale;

    drawWindow({
      ctx,
      x: this.windowX,
      y: this.windowY,
      width: this.windowWidth,
      height: this.windowHeight,
      uiScale: scale,
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
    drawLabel(
      ctx,
      this.headerStartX + this.windowX,
      this.headerStartY + this.windowY,
      'General',
      {
        font: '16px monospace',
        align: 'left',
        color: this.activeTab === 'display' ? '#6f6' : '#888',
      },
      scale
    );

    drawLabel(
      ctx,
      this.headerStartX + this.windowX + scaledHeaderItemWidth + scaledHeaderHorizontalPadding,
      this.headerStartY + this.windowY,
      'Volume',
      {
        font: '16px monospace',
        align: 'left',
        color: this.activeTab === 'volume' ? '#6f6' : '#888',
      },
      scale
    );

    // === Items in the active tab ===
    if (this.activeTab === 'display') {
      drawCheckbox(ctx, this.particleCheckbox!, scale);
      drawCheckbox(ctx, this.lightingCheckbox!, scale);
      drawCheckbox(ctx, this.collisionsCheckbox!, scale);

      drawCRTDropDown(ctx, this.resolutionDropdown!, scale, 'Resolution');

    } else if (this.activeTab === 'volume') {
      for (let i = 0; i < this.volumeSliders.length; i++) {
        const slider = this.volumeSliders[i];
        const label = this.volumeLabels[i]; // e.g. 'Music', 'Master'

        drawVolumeSlider(ctx, slider, scale, label);
      }
    }

    drawButton(ctx, this.closeButton!, scale);
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
