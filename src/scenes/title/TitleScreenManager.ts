// src/scenes/title/TitleScreenManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';
import { SaveGameManager } from '@/core/save/saveGameManager';
import { getUniformScaleFactor } from '@/config/view';
import { drawCursor, getCrosshairCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { drawButton, UIButton, handleButtonInteraction } from '@/ui/primitives/UIButton';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { loadImage } from '@/shared/imageCache';
import { missionRegistry } from '@/game/missions/MissionRegistry';
import { missionLoader } from '@/game/missions/MissionLoader';

import { isElectron } from '@/shared/isElectron';

const TITLE_IMAGE_PATH = 'assets/title_screen.png';

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
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private backgroundImage: HTMLImageElement | null = null;

  private buttons: UIButton[] = [];
  private saveSlotButtons: UIButton[] = [];
  private showingSaveSlots = false;

  private confirmingDeleteSlot: number | null = null;
  private confirmationButtons: UIButton[] = [];

  private saveSlotYOffsets: number[] = [0, 0, 0];
  private saveSlotAnimationPhase: 'sliding-up' | 'settling' | 'sliding-down' | null = null;
  private isAnimatingSlots = false;

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager
  ) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;

    this.buttons = this.createMainButtons();
  }

  async start() {
    audioManager.playMusic({ file: 'assets/sounds/music/track_08_debriefing.mp3' });
    this.backgroundImage = await loadImage(TITLE_IMAGE_PATH);
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();
  }

  stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
  }

  private createMainButtons(): UIButton[] {
    const uiScale = getUniformScaleFactor();
    const baseX = 40;
    const baseY = 460 * uiScale;
    const width = 200;
    const height = 60;
    const spacing = 10;

    const sharedStyle = {
      borderRadius: 10,
      alpha: 1,
      borderColor: '#00ff00',
      textFont: '18px monospace',
      backgroundGradient: {
        type: 'linear' as const,
        stops: [
          { offset: 0, color: '#002200' },
          { offset: 1, color: '#001500' }
        ]
      }
    };

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
      label: 'Credits',
      isHovered: false,
      onClick: () => {
        audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 1 });
        console.log('Credits clicked (not implemented)');
      },
      style: sharedStyle
    });

    // === Quit button (always visible in Electron builds) ===
    if (isElectron()) {
      buttons.push({
        x: baseX,
        y: baseY + (scaledVerticalSpacing * 2), // one row below Credits
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

  private createSaveSlotButtons(): UIButton[] {
    const uiScale = getUniformScaleFactor();
    const baseX = 260;
    const baseY = 460 * uiScale;
    const width = 260;
    const height = 60;
    const spacing = 10;

    const sharedStyle = {
      borderRadius: 10,
      alpha: 1,
      borderColor: '#00ff00',
      textFont: '18px monospace',
      backgroundGradient: {
        type: 'linear' as const,
        stops: [
          { offset: 0, color: '#002200' },
          { offset: 1, color: '#001500' }
        ]
      }
    };

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
          SaveGameManager.initialize(slot);
          const saveManager = SaveGameManager.getInstance();

          audioManager.play('assets/sounds/sfx/ui/start_00.wav', 'sfx');

          saveManager.changeSlot(slot);

          if (hasData) {
            saveManager.loadAll();
            this.stop();
            sceneManager.fadeToScene('hub');
          } else {
            PlayerTechnologyManager.getInstance().unlockMany([
              'hull1', 'engine1', 'turret1', 'fin1', 'facetplate1'
            ]);
            missionLoader.setMission(missionRegistry['mission_001']);
            this.stop();
            sceneManager.fadeToScene('mission');
          }
        },
        style: sharedStyle,
        // 👇 Attach slot index for animation
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
          style: {
            ...sharedStyle,
            borderColor: '#ff0000',
            backgroundGradient: {
              type: 'linear',
              stops: [
                { offset: 0, color: '#220000' },
                { offset: 1, color: '#110000' }
              ]
            }
          },
          slotIndex: slot // 👇 Needed so delete button animates with its row
        } as UIButton & { slotIndex: number });
      }
    }

    return buttons;
  }


  private createConfirmationButtons(): void {
    const uiScale = getUniformScaleFactor();
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
            this.saveSlotButtons = this.createSaveSlotButtons();
          }
          this.confirmingDeleteSlot = null;
          this.confirmationButtons = [];
        },
        style: {
          borderRadius: 6,
          borderColor: '#00ff00',
          textFont: '16px monospace',
          backgroundGradient: {
            type: 'linear',
            stops: [
              { offset: 0, color: '#003300' },
              { offset: 1, color: '#001900' }
            ]
          }
        }
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
  }

  private update = (_dt: number) => {
    // Handle sliding animation
    const uiScale = getUniformScaleFactor();

    const scaledSlotSlideSpeed = SLOT_SLIDE_SPEED * uiScale;
    const scaledSlotOvershoot = SLOT_OVERSHOOT * uiScale;
    const scaledSlotSettleSpeed = SLOT_SETTLE_SPEED * uiScale;
    const scaledSlotStartYOffset = SLOT_START_Y_OFFSET * uiScale;

    if (this.isAnimatingSlots) {
      if (this.saveSlotAnimationPhase === 'sliding-up') {
        for (let i = 0; i < this.saveSlotYOffsets.length; i++) {
          this.saveSlotYOffsets[i] -= scaledSlotSlideSpeed;
        }
        if (this.saveSlotYOffsets[0] <= -scaledSlotOvershoot) {
          this.saveSlotAnimationPhase = 'settling';
        }
      } else if (this.saveSlotAnimationPhase === 'settling') {
        for (let i = 0; i < this.saveSlotYOffsets.length; i++) {
          this.saveSlotYOffsets[i] += scaledSlotSettleSpeed;
          if (this.saveSlotYOffsets[i] > 0) this.saveSlotYOffsets[i] = 0;
        }
        if (this.saveSlotYOffsets.every(offset => offset === 0)) {
          this.isAnimatingSlots = false;
          this.saveSlotAnimationPhase = null;
        } 
      } else if (this.saveSlotAnimationPhase === 'sliding-down') {
          for (let i = 0; i < this.saveSlotYOffsets.length; i++) {
            this.saveSlotYOffsets[i] += scaledSlotSlideSpeed;
          }

          if (this.saveSlotYOffsets[0] >= scaledSlotStartYOffset) {
            // Finalize: hide save slots after animation completes
            this.isAnimatingSlots = false;
            this.saveSlotAnimationPhase = null;
            this.showingSaveSlots = false;
            this.saveSlotButtons = [];
            this.buttons = this.createMainButtons(); // update label to "Play"
            this.saveSlotYOffsets = [0, 0, 0]; // Reset
          }
        }
    }

    this.inputManager.updateFrame();

    const { x, y } = this.inputManager.getMousePosition();
    const click = this.inputManager.wasMouseClicked();

    const activeButtons = this.confirmingDeleteSlot !== null
      ? this.confirmationButtons
      : [...this.buttons, ...this.saveSlotButtons];

    for (const button of activeButtons) {
      handleButtonInteraction(button, x, y, click, uiScale);
    }
  };

  private render = (_dt: number) => {
    this.canvasManager.clearAll();

    const uiScale = getUniformScaleFactor();
    const bgCtx = this.canvasManager.getContext('background');
    const uiCtx = this.canvasManager.getContext('ui');

    if (this.backgroundImage) {
      bgCtx.drawImage(this.backgroundImage, 0, 0, bgCtx.canvas.width, bgCtx.canvas.height);
    }

    // Always render main buttons (Play/Back and Credits)
    for (const button of this.buttons) {
      drawButton(uiCtx, button, uiScale);
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
      uiCtx.fillText('Erase this save file?', 300 * uiScale, 320 * uiScale);

      // Did I accidently put this here when we should be rendering the delete confirmation buttons?
      for (const button of this.confirmationButtons) {
        drawButton(uiCtx, button, uiScale);
      }
    }

    const mouse = this.inputManager.getMousePosition();
    const cursor = getCrosshairCursorSprite();
    drawCursor(uiCtx, cursor, mouse.x, mouse.y, uiScale);
  };
}
