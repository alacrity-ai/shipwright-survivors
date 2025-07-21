// src/ui/menus/SettingsMenu.ts

import type { Menu } from '@/ui/interfaces/Menu';
import type { InputManager } from '@/core/InputManager';
import type { MenuManager } from '@/ui/MenuManager';
import type { AudioChannel } from '@/audio/AudioManager';
import type { CanvasManager } from '@/core/CanvasManager';

import { Camera } from '@/core/Camera';

import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';

import { DEFAULT_CONFIG } from '@/config/ui';

import { drawCheckbox, type UICheckbox } from '@/ui/primitives/UICheckBox';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { SaveGameManager } from '@/core/save/saveGameManager';
import { applyViewportResolution } from '@/shared/applyViewportResolution';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { getDropdownHoverInfo } from '@/ui/menus/helpers/getDropdownHoverInfo';

import { reportResolutionChange } from '@/core/interfaces/events/ResolutionChangeReporter';

import { getUniformScaleFactor } from '@/config/view';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawButton, type UIButton } from '@/ui/primitives/UIButton';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawVolumeSlider, type VolumeSlider } from '@/ui/primitives/VolumeSlider';
import { drawCRTDropDown, CRTDropDown } from '@/ui/primitives/CRTDropDown';

type SettingsTab = 'display' | 'volume' | 'controls' | 'keybinds';

type VolumeControlDef =
  | { kind: 'master' }
  | { kind: 'channel'; channel: AudioChannel };

const volumeDefs: VolumeControlDef[] = [
  { kind: 'master' },
  { kind: 'channel', channel: 'music' },
  { kind: 'channel', channel: 'sfx' },
  { kind: 'channel', channel: 'dialogue' },
];

const volumeGetters: Record<string, () => number> = {
  master: () => PlayerSettingsManager.getInstance().getMasterVolume(),
  music: () => PlayerSettingsManager.getInstance().getMusicVolume(),
  sfx: () => PlayerSettingsManager.getInstance().getSfxVolume(),
  dialogue: () => PlayerSettingsManager.getInstance().getDialogueVolume(),
};

const volumeSetters: Record<string, (v: number) => void> = {
  master: (v) => PlayerSettingsManager.getInstance().setMasterVolume(v),
  music: (v) => PlayerSettingsManager.getInstance().setMusicVolume(v),
  sfx: (v) => PlayerSettingsManager.getInstance().setSfxVolume(v),
  dialogue: (v) => PlayerSettingsManager.getInstance().setDialogueVolume(v),
};

export class SettingsMenu implements Menu {
  private inputManager: InputManager;
  private menuManager: MenuManager | null = null;
  private canvasManager: CanvasManager;
  private camera: Camera;
  private activeTab: SettingsTab = 'display';
  private open = false;

  private volumeLabels = ['Master Volume', 'Music Volume', 'Sound Effects', 'Dialogue Volume'];

  private closeButton: UIButton | null = null;
  private volumeSliders: VolumeSlider[] = [];

  private aimModeCheckbox: UICheckbox | null = null;
  private damageTextCheckbox: UICheckbox | null = null;
  private lightingCheckbox: UICheckbox | null = null;
  private collisionsCheckbox: UICheckbox | null = null;

  private resolutionDropdown: CRTDropDown | null = null;

  private windowX = 450;
  private windowY = 120;
  private windowHeight = 460;
  private windowWidth = 440;

  private headerStartY = 20;
  private headerStartX = 60;
  private headerHeight = 40;
  private headerItemWidth = 80;
  private headerHorizontalPadding = 12;
  private headerVerticalPadding = 6;

  private buttonWidth = 120;
  private buttonHeight = 40;
  private sliderWidth = 120;
  private sliderHeight = 12;
  private dropdownWidth = 120;
  private dropdownHeight = 28;
  private checkboxSize = 14;

  private resolutionLocked: boolean = false;

  private baseX: number = 0;
  private baseY: number = 0;

  private itemVerticalSpacing = 40;

  private margin = 20;

  constructor(inputManager: InputManager, menuManager: MenuManager | null, canvasManager: CanvasManager) {
    this.inputManager = inputManager;
    this.menuManager = menuManager;
    this.canvasManager = canvasManager;
    this.camera = Camera.getInstance();

    // Initialize UI elements
    this.initialize();
  }

  initialize(): void {
    const settings = PlayerSettingsManager.getInstance();
    SaveGameManager.loadSettings();

    const uiScale = getUniformScaleFactor();
    const scaledMargin = this.margin * uiScale;
    const scaledHeaderHeight = this.headerHeight * uiScale;
    const scaledItemVerticalSpacing = this.itemVerticalSpacing * uiScale;
    const scaledWindowHeight = this.windowHeight * uiScale;

    this.baseX = (this.windowX * uiScale) + scaledMargin;
    this.baseY = (this.windowY * uiScale) + scaledMargin + scaledHeaderHeight + (30 * uiScale);

    // Close button on Bottom right of window
    // The buttons origin is its center
    this.closeButton = {
      x: this.baseX + (150 * uiScale),
      y: this.baseY + scaledWindowHeight - (140 * uiScale),
      width: this.buttonWidth,
      height: this.buttonHeight,
      label: 'Close',
      onClick: () => {
        if (this.menuManager) {
          const pauseMenu = this.menuManager.getMenu('pauseMenu');
          if (pauseMenu) {
            GlobalMenuReporter.getInstance().setMenuClosed('settingsMenu');
            this.menuManager.transition(pauseMenu)
          }
        } else {
          this.closeMenu();
        }
      },
      style: {
        borderRadius: 10,
        alpha: 0.8,
        borderColor: DEFAULT_CONFIG.button.style.borderColor,
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: DEFAULT_CONFIG.button.style.backgroundGradient.stops[0].color },
            { offset: 1, color: DEFAULT_CONFIG.button.style.backgroundGradient.stops[1].color }
          ]
        }
      }
    };

    /* == UI Elements all in same column starting in top left of window 
    == (Position accounting for margin and tabs bar) */

    // == Volume Tab
    // Volume sliders are top most item in column in their tab
    this.volumeSliders = volumeDefs.map((def, i) => {
      const key = def.kind === 'master' ? 'master' : def.channel;
      return {
        x: this.baseX,
        y: this.baseY + i * scaledItemVerticalSpacing,
        width: this.sliderWidth,
        height: this.sliderHeight,
        value: volumeGetters[key](),
        onChange: (v: number) => {
          volumeSetters[key](v);
          SaveGameManager.saveSettings();
        },
      };
    });

    // == Display Tab

    this.aimModeCheckbox = {
      x: this.baseX,
      y: this.baseY,
      size: this.checkboxSize,
      label: 'Auto Fire',
      checked: settings.getAimMode() === 'auto',
      onToggle: (val) => {
        this.aimModeCheckbox!.checked = val;
        settings.setAimMode(val ? 'auto' : 'manual');
        SaveGameManager.saveSettings();
      }
    };

    // Particle Checkbox is (first) top most item in column in its tab
    this.damageTextCheckbox = {
      x: this.baseX,
      y: this.baseY + scaledItemVerticalSpacing,
      size: this.checkboxSize,
      label: 'Damage Text Enabled',
      checked: settings.isParticlesEnabled(),
      onToggle: (val) => {
        this.damageTextCheckbox!.checked = val;
        settings.setDamageTextEnabled(val);
        SaveGameManager.saveSettings();
      }
    };

    this.lightingCheckbox = {
      x: this.baseX,
      y: this.baseY + scaledItemVerticalSpacing * 2,
      size: this.checkboxSize,
      label: 'Lighting Enabled',
      checked: settings.isLightingEnabled(),
      onToggle: (val) => {
        this.lightingCheckbox!.checked = val;
        settings.setLightingEnabled(val);
        SaveGameManager.saveSettings();
      }
    };

    this.collisionsCheckbox = {
      x: this.baseX,
      y: this.baseY + scaledItemVerticalSpacing * 3,
      size: this.checkboxSize,
      label: 'Collisions Enabled',
      checked: settings.isCollisionsEnabled(),
      onToggle: (val) => {
        this.collisionsCheckbox!.checked = val;
        settings.setCollisionsEnabled(val);
        SaveGameManager.saveSettings();
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
      x: this.baseX,
      y: this.baseY + scaledItemVerticalSpacing * 4,
      width: this.dropdownWidth,
      height: this.dropdownHeight,
      items: resolutionItems,
      selectedIndex: resolutionItems.findIndex(item => item.value === currentRes) || 0,
      isOpen: false,
      onSelect: (item) => {
        const [wStr, hStr] = item.value.split('x');
        settings.setViewportWidth(parseInt(wStr, 10));
        settings.setViewportHeight(parseInt(hStr, 10));
        SaveGameManager.saveSettings();
        reportResolutionChange(settings.getViewportWidth(), settings.getViewportHeight());
      },
      style: {
        borderColor: DEFAULT_CONFIG.window.options.borderColor,
        textColor: DEFAULT_CONFIG.general.textColor,
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
    const scale = getUniformScaleFactor();

    const scaledHeaderItemWidth = this.headerItemWidth * scale;
    const scaledHeaderHorizontalPadding = this.headerHorizontalPadding * scale;
    const scaledheaderStartX = this.headerStartX * scale;
    const scaledheaderStartY = this.headerStartY * scale;
    const scaledWindowX = this.windowX * scale;
    const scaledWindowY = this.windowY * scale;

    // === Tab click logic ===
    if (clicked) {
      const baseX = scaledheaderStartX + scaledWindowX;
      const baseY = scaledheaderStartY + scaledWindowY;
      const tabRects = [
        { tab: 'display', label: 'General' },
        { tab: 'volume', label: 'Volume' },
        { tab: 'controls', label: 'Controls' },
        { tab: 'keybinds', label: 'Keybinds' },
      ];

      for (let i = 0; i < tabRects.length; i++) {
        const x = baseX + i * (scaledHeaderItemWidth + scaledHeaderHorizontalPadding);
        if (
          isMouseOverRect(mouse.x, mouse.y, {
            x,
            y: baseY + (this.headerVerticalPadding * scale),
            width: this.headerItemWidth,
            height: this.headerHeight,
          }, scale)
        ) {
          this.activeTab = tabRects[i].tab as SettingsTab;
          break;
        }
      }
    }

    // === Display tab ===
    if (this.activeTab === 'display') {
      for (const cb of [
        this.aimModeCheckbox, 
        this.damageTextCheckbox, 
        this.lightingCheckbox, 
        this.collisionsCheckbox
      ]) {
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
    if (!this.resolutionLocked) {
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
    const scale = getUniformScaleFactor();

    const scaledHeaderItemWidth = this.headerItemWidth * scale;
    const scaledHeaderHorizontalPadding = this.headerHorizontalPadding * scale;

    const scaledWindowX = this.windowX * scale;
    const scaledWindowY = this.windowY * scale;
    const scaledWindowWidth = this.windowWidth * scale;
    const scaledWindowHeight = this.windowHeight * scale;
    const scaledHeaderX = this.headerStartX * scale;
    const scaledHeaderY = this.headerStartY * scale;

    drawWindow({
      ctx,
      x: scaledWindowX,
      y: scaledWindowY,
      width: scaledWindowWidth,
      height: scaledWindowHeight,
      // uiScale: scale,
      options: DEFAULT_CONFIG.window.options
    });

    // === Tab Labels ===
    const tabs: { tab: SettingsTab; label: string }[] = [
      { tab: 'display', label: 'General' },
      { tab: 'volume', label: 'Volume' },
      { tab: 'controls', label: 'Controls' },
      { tab: 'keybinds', label: 'Keybinds' },
    ];

    tabs.forEach((tabInfo, index) => {
      drawLabel(
        ctx,
        scaledHeaderX + scaledWindowX + index * (scaledHeaderItemWidth + scaledHeaderHorizontalPadding),
        scaledHeaderY + scaledWindowY + (this.headerVerticalPadding * scale),
        tabInfo.label,
        {
          font: '16px monospace',
          align: 'left',
          color: this.activeTab === tabInfo.tab ? DEFAULT_CONFIG.general.accentColor : DEFAULT_CONFIG.general.infoTextColor,
        },
        scale
      );
    });

    // === Items in the active tab ===
    if (this.activeTab === 'display') {
      drawCheckbox(ctx, this.aimModeCheckbox!, scale);
      drawCheckbox(ctx, this.damageTextCheckbox!, scale);
      drawCheckbox(ctx, this.lightingCheckbox!, scale);
      drawCheckbox(ctx, this.collisionsCheckbox!, scale);
      if (this.resolutionLocked) {
        drawLabel(
          ctx,
          this.resolutionDropdown!.x,
          this.resolutionDropdown!.y + 6 * scale, // slight vertical adjustment for better centering
          'Resolution can be changed from the Title Screen',
          {
            font: '14px monospace',
            align: 'left',
            color: '#888',
          },
          scale
        );
      } else {
        drawCRTDropDown(ctx, this.resolutionDropdown!, scale, 'Resolution');
      }

    } else if (this.activeTab === 'volume') {
      for (let i = 0; i < this.volumeSliders.length; i++) {
        const slider = this.volumeSliders[i];
        const label = this.volumeLabels[i];
        drawVolumeSlider(ctx, slider, scale, label);
      }

    } else if (this.activeTab === 'controls') {
      drawLabel(
        ctx,
        500 * scale,
        300 * scale,
        'Controls tab coming soon...',
        { font: '14px monospace', align: 'left', color: '#ccc' },
        scale
      );

    } else if (this.activeTab === 'keybinds') {
      drawLabel(
        ctx,
        500 * scale,
        300 * scale,
        'Keybinds tab coming soon...',
        { font: '14px monospace', align: 'left', color: '#ccc' },
        scale
      );
    }

    drawButton(ctx, this.closeButton!, scale);
  }

  isOpen(): boolean {
    return this.open;
  }

  openMenu(): void {
    this.open = true;
    GlobalMenuReporter.getInstance().setMenuOpen('settingsMenu');
    this.inputManager.setGamepadMousemockingEnabled(true);
    this.inputManager.setGamepadCursorOverrideEnabled(false);
  }

  closeMenu(): void {
    this.open = false;
    GlobalMenuReporter.getInstance().setMenuClosed('settingsMenu');
    this.inputManager.setGamepadMousemockingEnabled(true);
    this.inputManager.setGamepadCursorOverrideEnabled(true);
  }

  lockResolution(): void {
    this.resolutionLocked = true;
  }

  unlockResolution(): void {
    this.resolutionLocked = false;
  }

  isBlocking(): boolean {
    return true;
  }
}
