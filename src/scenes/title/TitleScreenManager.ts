// src/scenes/title/TitleScreenManager.ts

import { DEFAULT_CONFIG } from '@/config/ui';
import { BUILD_VERSION } from '@/config/version';

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { SaveGameManager } from '@/core/save/saveGameManager';
import { getUniformScaleFactor } from '@/config/view';
import { drawCursor, getCrosshairCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { drawButton, UIButton, handleButtonInteraction } from '@/ui/primitives/UIButton';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { missionRegistry } from '@/game/missions/MissionRegistry';
import { missionLoader } from '@/game/missions/MissionLoader';
import { ensureInitialUnlocks } from '@/game/player/helpers/ensureInitialUnlocks';
import { resetPlayerData } from '@/game/player/helpers/playerResetService';

import type { NavPoint } from '@/core/input/interfaces/NavMap';
import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';

import { applyCoolCinematicEffect, applyWarmCinematicEffect } from '@/core/interfaces/events/PostProcessingEffectReporter';

import { WordRenderer } from '@/ui/primitives/controllers/WordRenderer';
import { clearLetterCache } from '@/rendering/cache/Letters';

import { isElectron } from '@/shared/isElectron';
import { TitleScreenRuntime } from '@/core/TitleScreenRuntime';

import { SelectionMenu } from '@/scenes/title/SelectionMenu';
import { SettingsMenu } from '@/ui/menus/SettingsMenu';

import { GlobalEventBus } from '@/core/EventBus';

function hasSaveData(slot: number): boolean {
  return !!localStorage.getItem(`save${slot}`);
}

const SLOT_START_Y_OFFSET = 300;
const SLOT_SLIDE_SPEED = 10;
const SLOT_OVERSHOOT = 16;
const SLOT_SETTLE_SPEED = 2;

const WINDOW_X = 280;
const WINDOW_Y = 280;
const WINDOW_WIDTH = 320;
const WINDOW_HEIGHT = 120;

export class TitleScreenManager {
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private titleScreenRuntime: TitleScreenRuntime | null = null;
  private titleRenderer: WordRenderer | null = null;
  private subtitleRenderer: WordRenderer | null = null;

  private gamepadNavManager: GamepadMenuInteractionManager;

  private settingsMenu: SettingsMenu | null = null;
  private selectionMenu: SelectionMenu | null = null;

  private scale = getUniformScaleFactor();

  private buttons: UIButton[] = [];
  private saveSlotButtons: UIButton[] = [];
  private showingSaveSlots = false;

  private confirmingDeleteSlot: number | null = null;
  private confirmationButtons: UIButton[] = [];

  private saveSlotYOffsets: number[] = [0, 0, 0];
  private saveSlotAnimationPhase: 'sliding-up' | 'settling' | 'sliding-down' | null = null;
  private isAnimatingSlots = false;
  private buttonsHidden = false;

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager
  ) {
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;
    this.titleScreenRuntime = new TitleScreenRuntime();
    this.gamepadNavManager = new GamepadMenuInteractionManager(this.inputManager);

    this.settingsMenu = new SettingsMenu(this.inputManager, null, CanvasManager.getInstance());
    this.selectionMenu = new SelectionMenu(this.inputManager, this.gamepadNavManager);

    this.buttons = this.createMainButtons();

    this.titleRenderer = new WordRenderer(125 * this.scale, 100 * this.scale);
    this.subtitleRenderer = new WordRenderer(495 * this.scale, 200 * this.scale);
    this.setTitle();

    GlobalEventBus.on('game:selection:menu:launchMission', this.handleLaunchMission);
    GlobalEventBus.on('game:selection:menu:collection', this.handleOpenCollection);
    GlobalEventBus.on('game:selection:menu:passiveSkills', this.handleOpenPassiveSkills);
    GlobalEventBus.on('game:selection:menu:quit', this.handleQuit);
  }

  private handleLaunchMission = (): void => {
    this.stop();
    sceneManager.fadeToScene('galaxy');
  }

  private handleOpenCollection = (): void => {
    // Handle
  }

  private handleOpenPassiveSkills = (): void => {
    this.stop();
    sceneManager.fadeToScene('player-passives');
  }

  private handleQuit = (): void => {
    this.selectionMenu?.closeMenu();
    this.titleScreenRuntime?.rehomeCamera();
    this.showAndEnableButtons();
    this.setTitle();
    this.buildNavMap();
    applyWarmCinematicEffect();
  }

  private setTitle(): void {
    this.titleRenderer?.setWord('SHIPWRIGHT');
    this.titleRenderer?.setBreathingPulse();
    this.subtitleRenderer?.setWord('SURVIVORS');
    this.subtitleRenderer?.setBreathingPulse();
  }

  private clearTitle(): void {
    this.titleRenderer?.setWord('');
    this.subtitleRenderer?.setWord('');
  }

  private buildNavMap(): void {
    const scale = this.scale;
    const navPoints: NavPoint[] = [];

    if (this.confirmingDeleteSlot !== null) {
      // === Confirmation popup ===
      for (let i = 0; i < this.confirmationButtons.length; i++) {
        const btn = this.confirmationButtons[i];
        navPoints.push({
          gridX: i,
          gridY: 0,
          screenX: btn.x + (btn.width * scale) / 2,
          screenY: btn.y + (btn.height * scale) / 2,
          isEnabled: true,
        });
      }
    } else if (this.showingSaveSlots) {
  // === Save slots + delete + back button
  for (const btn of this.saveSlotButtons) {
    const slot = (btn as UIButton & { slotIndex: number }).slotIndex;
    const yOffset = this.saveSlotYOffsets[slot] ?? 0;
    const centerX = btn.x + (btn.width * scale) / 2;
    const centerY = btn.y + (btn.height * scale) / 2 + yOffset;

    let gridX: number;
    if (btn.label === 'X') {
      gridX = 2;
    } else {
      gridX = 1;
    }

    navPoints.push({
      gridX,
      gridY: slot,
      screenX: centerX,
      screenY: centerY,
      isEnabled: true,
    });
  }

  // Back button always at (0,0)
  const backBtn = this.buttons[0];
  navPoints.push({
    gridX: 0,
    gridY: 0,
    screenX: backBtn.x + (backBtn.width * scale) / 2,
    screenY: backBtn.y + (backBtn.height * scale) / 2,
    isEnabled: true,
  });
} else {
      // === Main buttons (Play, Settings, Editor, Quit)
      for (let i = 0; i < this.buttons.length; i++) {
        const btn = this.buttons[i];
        navPoints.push({
          gridX: 0,
          gridY: i,
          screenX: btn.x + (btn.width * scale) / 2,
          screenY: btn.y + (btn.height * scale) / 2,
          isEnabled: true,
        });
      }
    }

    this.gamepadNavManager.setNavMap(navPoints);

    const firstEnabled = navPoints.find(p => p.isEnabled);
    if (firstEnabled) {
      this.gamepadNavManager.setCurrentGridPosition(firstEnabled.gridX, firstEnabled.gridY);
    }
  }

  private shouldAllowNavBuild(): boolean {
    return !this.isAnimatingSlots && !this.settingsMenu?.isOpen();
  }

  async start(effect: 'warm' | 'cool' = 'warm') {
    audioManager.playMusic({ file: 'assets/sounds/music/track_00_title.mp3' });
    if (this.titleScreenRuntime) {
      await this.titleScreenRuntime.initialize();
      this.titleScreenRuntime.start(effect);
    }
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();
  }

  stop() {
    if (this.titleScreenRuntime) {
      this.titleScreenRuntime.destroy();
    }

    clearLetterCache();

    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);

    this.settingsMenu?.closeMenu();
    this.saveSlotButtons = [];
    this.confirmationButtons = [];
    this.buttons = [];

    GlobalEventBus.off('game:selection:menu:launchMission', this.handleLaunchMission);
    GlobalEventBus.off('game:selection:menu:collection', this.handleOpenCollection);
    GlobalEventBus.off('game:selection:menu:passiveSkills', this.handleOpenPassiveSkills);
    GlobalEventBus.off('game:selection:menu:quit', this.handleQuit);
  }

  private createMainButtons(): UIButton[] {
    const uiScale = this.scale;
    const baseX = 40;
    const baseY = 460 * uiScale;
    const width = 200;
    const height = 60;
    const spacing = 10;

    const sharedStyle = DEFAULT_CONFIG.button.style;

    const backButtonStyle = {
      borderRadius: 10,
      alpha: 1,
      borderColor: '#ffaa00',
      textFont: '18px monospace',
      backgroundGradient: {
        type: 'linear' as const,
        stops: [
          { offset: 0, color: '#221100' },
          { offset: 1, color: '#150a00' }
        ]
      }
    };

    const buttons: UIButton[] = [];

    const scaledVerticalSpacing = (height * uiScale) + (spacing * uiScale);

    // === Play/Back button (changes based on state) ===
    buttons.push({
      x: baseX,
      y: baseY + (scaledVerticalSpacing * 0),
      width,
      height,
      label: this.showingSaveSlots ? 'Back' : 'Play',
      isHovered: false,
      onClick: () => {
        audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 1 });

        if (this.showingSaveSlots) {
          // Animate sliding down
          this.saveSlotAnimationPhase = 'sliding-down';
          this.isAnimatingSlots = true;
          if (this.shouldAllowNavBuild()) {
            this.buildNavMap();
          }

          // Delay actual hide/removal until animation completes
        } else {
          // Animate sliding up
          const scaledStartYOffset = SLOT_START_Y_OFFSET * uiScale;
          this.saveSlotYOffsets = [scaledStartYOffset, scaledStartYOffset, scaledStartYOffset];
          this.saveSlotAnimationPhase = 'sliding-up';
          this.isAnimatingSlots = true;

          this.showingSaveSlots = true;
          this.saveSlotButtons = this.createSaveSlotButtons();
          this.buttons = this.createMainButtons(); // update label to "Back"
          if (this.shouldAllowNavBuild()) {
            this.buildNavMap();
          }
        }
      },
      style: this.showingSaveSlots ? backButtonStyle : sharedStyle
    });

    // === Credits button (always visible) ===
    buttons.push({
      x: baseX,
      y: baseY + (scaledVerticalSpacing * 1),
      width,
      height,
      label: 'Settings',
      isHovered: false,
      onClick: () => {
        audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 1 });
        this.settingsMenu?.openMenu();
      },
      style: sharedStyle
    });

    // === Editor Button (TODO : Remove in production) ===
    buttons.push({
      x: baseX,
      y: baseY + (scaledVerticalSpacing * 2),
      width,
      height,
      label: 'Editor',
      isHovered: false,
      onClick: () => {
        PlayerSettingsManager.getInstance().setDebugMode(true);
        missionLoader.setMission(missionRegistry['mission_editor']);
        this.stop();
        PlayerTechnologyManager.getInstance().unlockAll();
        sceneManager.fadeToScene('mission');
      },
      style: sharedStyle
    });

    // === Quit button (always visible in Electron builds) ===
    if (isElectron()) {
      buttons.push({
        x: baseX,
        y: baseY + (scaledVerticalSpacing * 3),
        width,
        height,
        label: 'Quit',
        isHovered: false,
        onClick: () => {
          audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 1 });
          if (window?.electronAPI?.closeGame) {
            window.electronAPI.closeGame();
          } else {
            console.warn('Quit button pressed, but electronAPI.closeGame is not available.');
          }
        },
        style: sharedStyle
      });
    }

    return buttons;
  }

  public instantlyGoToSelectionMenu(): void {
    SaveGameManager.getInstance().saveAll();
    this.selectionMenu?.openMenu();
    this.clearTitle();
    this.hideAndDisableButtons();
    this.gamepadNavManager.clearNavMap();
    this.titleScreenRuntime?.moveCameraTo(6000, -1200, 200000);
  }

  private createSaveSlotButtons(): UIButton[] {
    const uiScale = this.scale;
    const baseX = 260;
    const baseY = 460 * uiScale;
    const width = 260;
    const height = 60;
    const spacing = 10;

    const buttons: UIButton[] = [];

    for (let slot = 0; slot < 3; slot++) {
      const hasData = hasSaveData(slot);
      const label = hasData ? `Load Save ${slot + 1}` : `New Game`;

      const scaledVerticalSpacing = (height * uiScale) + (spacing * uiScale);
      const scaledHorizontalSpacing = (width * uiScale) + (spacing * uiScale);
      const scaledWidth = width * uiScale;

      // === Main save/load button ===
      buttons.push({
        x: baseX * uiScale,
        y: baseY + scaledVerticalSpacing * slot,
        width,
        height,
        label,
        isHovered: false,
        onClick: () => {
          audioManager.play('assets/sounds/sfx/ui/start_00.wav', 'sfx');

          SaveGameManager.initialize(slot);
          const saveManager = SaveGameManager.getInstance();
          saveManager.changeSlot(slot);

          if (!hasData) {
            ensureInitialUnlocks();
            saveManager.saveAll();
          }
          
          // Clear navmap
          this.gamepadNavManager.clearNavMap();

          // Clear Title
          this.clearTitle();

          // Load save data
          saveManager.loadAll();

          // Pan camera to new location
          this.titleScreenRuntime?.moveCameraTo(6000, -1200, 8000);

          // Hide and disable all buttons
          this.hideAndDisableButtons();

          // Set post process effects
          applyCoolCinematicEffect();

          // Open the selection menu after a second
          setTimeout(() => {
            this.selectionMenu?.openMenu();
          }, 1000);
        },
        style: DEFAULT_CONFIG.button.style,
        // Attach slot index for animation
        slotIndex: slot
      } as UIButton & { slotIndex: number });

      // === Delete button if save exists ===
      if (hasData) {
        buttons.push({
          x: baseX + scaledHorizontalSpacing + (0.65 * scaledWidth),
          y: baseY + scaledVerticalSpacing * slot,
          width: 40,
          height,
          label: 'X',
          isHovered: false,
          onClick: () => {
            audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 4 });
            this.confirmingDeleteSlot = slot;
            this.createConfirmationButtons();
          },
          style: DEFAULT_CONFIG.button.style,
          slotIndex: slot // Needed so delete button animates with its row
        } as UIButton & { slotIndex: number });
      }
    }

    if (this.shouldAllowNavBuild()) {
      this.buildNavMap();
    }
    return buttons;
  }

  private createConfirmationButtons(): void {
    const uiScale = this.scale;
    const scaledWindowX = WINDOW_X * uiScale;
    const scaledWindowY = WINDOW_Y * uiScale;
    const confirmX = scaledWindowX + (40 * uiScale); // 40
    const confirmY = scaledWindowY + (60 * uiScale); // 60
    const width = 100;
    const height = 40;
    const spacing = 20;

    const scaledHorizontalSpacing = (width * uiScale) + (spacing * uiScale);

    this.confirmationButtons = [
      {
        x: confirmX,
        y: confirmY,
        width,
        height,
        label: 'Yes',
        isHovered: false,
        onClick: () => {
          audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 1 });
          if (this.confirmingDeleteSlot !== null) {
            SaveGameManager.eraseSave(this.confirmingDeleteSlot);
            resetPlayerData();
            this.saveSlotButtons = this.createSaveSlotButtons();
          }
          this.confirmingDeleteSlot = null;
          this.confirmationButtons = [];
          if (this.shouldAllowNavBuild()) {
            this.buildNavMap();
          }
        },
        style: DEFAULT_CONFIG.button.style
      },
      {
        x: confirmX + scaledHorizontalSpacing,
        y: confirmY,
        width,
        height,
        label: 'No',
        isHovered: false,
        onClick: () => {
          audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 1 });
          this.confirmingDeleteSlot = null;
          this.confirmationButtons = [];
          if (this.shouldAllowNavBuild()) {
            this.buildNavMap();
          }
        },
        style: {
          borderRadius: 6,
          borderColor: '#ff0000',
          textFont: '16px monospace',
          backgroundGradient: {
            type: 'linear',
            stops: [
              { offset: 0, color: '#330000' },
              { offset: 1, color: '#190000' }
            ]
          }
        }
      }
    ];
    if (this.shouldAllowNavBuild()) {
      this.buildNavMap();
    }
  }

  private hideAndDisableButtons(): void {
    this.buttonsHidden = true;
  }

  private showAndEnableButtons(): void {
    this.buttonsHidden = false;
  }

  private update = (dt: number) => {
    if (this.titleScreenRuntime) {
      this.titleScreenRuntime.update(dt);
    }
    
    this.inputManager.updateFrame();

    if (this.selectionMenu?.isOpen()) {
      this.selectionMenu.update(dt);
      return;
    }

    if (this.buttonsHidden) return;

    // Handle sliding animation
    const uiScale = this.scale;

    const scaledSlotSlideSpeed = SLOT_SLIDE_SPEED * uiScale;
    const scaledSlotOvershoot = SLOT_OVERSHOOT * uiScale;
    const scaledSlotSettleSpeed = SLOT_SETTLE_SPEED * uiScale;
    const scaledSlotStartYOffset = SLOT_START_Y_OFFSET * uiScale;

    if (this.isAnimatingSlots) {
      switch (this.saveSlotAnimationPhase) {
        case 'sliding-up': {
          let transitioned = false;
          for (let i = 0; i < this.saveSlotYOffsets.length; i++) {
            this.saveSlotYOffsets[i] -= scaledSlotSlideSpeed;
            if (this.saveSlotYOffsets[i] <= -scaledSlotOvershoot) {
              transitioned = true;
            }
          }

          if (transitioned) {
            this.saveSlotAnimationPhase = 'settling';
          }
          break;
        }

        case 'settling': {
          let allSettled = true;
          for (let i = 0; i < this.saveSlotYOffsets.length; i++) {
            this.saveSlotYOffsets[i] += scaledSlotSettleSpeed;
            if (this.saveSlotYOffsets[i] > 0) {
              this.saveSlotYOffsets[i] = 0;
            } else {
              allSettled = false;
            }
          }

          if (allSettled) {
            this.saveSlotAnimationPhase = null;
            this.isAnimatingSlots = false;
            if (this.shouldAllowNavBuild()) {
              this.buildNavMap(); // safe to build nav after animation completes
            }
          }
          break;
        }

        case 'sliding-down': {
          let allSlidDown = true;
          for (let i = 0; i < this.saveSlotYOffsets.length; i++) {
            this.saveSlotYOffsets[i] += scaledSlotSlideSpeed;
            if (this.saveSlotYOffsets[i] < scaledSlotStartYOffset) {
              allSlidDown = false;
            }
          }

          if (allSlidDown) {
            // Finalize hide transition
            this.isAnimatingSlots = false;
            this.saveSlotAnimationPhase = null;
            this.showingSaveSlots = false;
            this.saveSlotButtons = [];
            this.buttons = this.createMainButtons();
            this.saveSlotYOffsets = [0, 0, 0];

            if (this.shouldAllowNavBuild()) {
              this.buildNavMap(); // rebuild nav for main buttons
            }
          }
          break;
        }
      }
    }

    if (!this.settingsMenu?.isOpen()) {
      this.gamepadNavManager.update();

      if (this.inputManager.isUsingGamepad?.()) {
        if (!this.gamepadNavManager.hasNavMap()) {
          if (this.shouldAllowNavBuild()) {
            this.buildNavMap();
          }
        }

        if (this.inputManager.wasGamepadAliasJustPressed('B')) {
          if (this.confirmingDeleteSlot !== null) {
            this.confirmingDeleteSlot = null;
            this.confirmationButtons = [];
            if (this.shouldAllowNavBuild()) {
              this.buildNavMap();
            }
          } else if (this.showingSaveSlots) {
            this.buttons[0].onClick?.(); // Simulate "Back"
          }
        }
      } else {
        if (this.gamepadNavManager.hasNavMap()) {
          this.gamepadNavManager.clearNavMap();
        }
      }
    }

    const { x, y } = this.inputManager.getMousePosition();
    const click = this.inputManager.wasMouseClicked();

    // Handle play/back button interaction
    handleButtonInteraction(this.buttons[0], x, y, click, uiScale);

    if (!this.showingSaveSlots) {
    // Handle settings button interaction
      handleButtonInteraction(this.buttons[1], x, y, click, uiScale);

      // Handle editor button interaction
      handleButtonInteraction(this.buttons[2], x, y, click, uiScale);

      // Handle Quit button interaction
      // TODO : When editor removed, this will need to be > 2
      if (this.buttons.length > 3) {
        handleButtonInteraction(this.buttons[3], x, y, click, uiScale);
      }
    }

    // Handle save slot button interaction or delete save prompt buttons
    const activeButtons = this.confirmingDeleteSlot !== null
      ? this.confirmationButtons
      : this.saveSlotButtons;

    for (const button of activeButtons) {
      handleButtonInteraction(button, x, y, click, uiScale);
    }

    this.settingsMenu?.update();
  };

  private render = (dt: number) => {
    // Render the Titlescreen Runtime
    if (this.titleScreenRuntime) {
      this.titleScreenRuntime.render(dt);
    }

    const canvasManager = CanvasManager.getInstance();
    const uiScale = this.scale;
    const uiCtx = canvasManager.getContext('overlay');

    if (this.selectionMenu?.isOpen()) {
      this.selectionMenu.render();
      const mouse = this.inputManager.getMousePosition();
      const cursor = getCrosshairCursorSprite();

      if (!this.inputManager.isUsingGamepad?.() || this.settingsMenu?.isOpen()) {
        drawCursor(uiCtx, cursor, mouse.x, mouse.y, uiScale);
      }
    }

    if (this.buttonsHidden) return;

    canvasManager.clearAll();

    // Play/Back button
    drawButton(uiCtx, this.buttons[0], uiScale);

    if (!this.showingSaveSlots) {
      // Settings button
      drawButton(uiCtx, this.buttons[1], uiScale);

      // Editor button
      drawButton(uiCtx, this.buttons[2], uiScale);

      // Quit button // TODO : When editor removed, this will need to be > 2
      if (this.buttons.length > 3) {
        drawButton(uiCtx, this.buttons[3], uiScale);
      }
    }

    // Render save slot buttons when showing save slots
    if (this.showingSaveSlots) {
      for (const button of this.saveSlotButtons) {
        const slotIndex = (button as UIButton & { slotIndex: number }).slotIndex;
        const offset = this.saveSlotYOffsets[slotIndex] ?? 0;
        const originalY = button.y;
        button.y += offset;
        drawButton(uiCtx, button, uiScale);
        button.y = originalY;
      }
    }

    if (this.confirmingDeleteSlot !== null) {
      drawWindow({
        ctx: uiCtx,
        x: WINDOW_X * uiScale,
        y: WINDOW_Y * uiScale,
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        title: 'Confirm Deletion',
        mouse: this.inputManager.getMousePosition(),
        clicked: this.inputManager.wasMouseClicked(),
        uiScale: uiScale,
        options: {
          borderColor: '#ff0000',
          backgroundGradient: {
            type: 'linear',
            stops: [
              { offset: 0, color: '#200000' },
              { offset: 1, color: '#100000' }
            ]
          }
        }
      });

      // === Confirmation text ===
      const fontSize = 14 * uiScale;
      uiCtx.fillStyle = '#ff4444';
      uiCtx.font = `${Math.round(fontSize)}px monospace`;
      uiCtx.fillText('Erase this save file?', 360 * uiScale, 320 * uiScale);

      // Render confirmation buttons
      for (const button of this.confirmationButtons) {
        drawButton(uiCtx, button, uiScale);
      }
    }

    // Render settings menu / title text
    if (!this.settingsMenu?.isOpen()) {
      this.titleRenderer!.render(uiCtx, dt);
      this.subtitleRenderer!.render(uiCtx, dt);
    } else {
      this.settingsMenu?.render(uiCtx);
    }

    // Draw current build version label
    drawLabel(uiCtx, 1220 * uiScale, 690 * uiScale, `v${BUILD_VERSION}`, { color: '#00FFFF' }, uiScale);

    const mouse = this.inputManager.getMousePosition();
    const cursor = getCrosshairCursorSprite();

    if (!this.inputManager.isUsingGamepad?.() || this.settingsMenu?.isOpen()) {
      drawCursor(uiCtx, cursor, mouse.x, mouse.y, uiScale);
    }

    if (!this.settingsMenu?.isOpen()) {
      this.inputManager.setGamepadMousemockingEnabled(false);
      this.inputManager.setGamepadCursorOverrideEnabled(false);
    }
  };
}
