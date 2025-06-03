// src/scenes/title/TitleScreenManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';
import { PlayerTechnologyManager } from '@/game/player/PlayerTechnologyManager';
import { SaveGameManager } from '@/core/save/saveGameManager';

import { getCrosshairCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { loadImage } from '@/shared/imageCache';
import { missionRegistry } from '@/game/missions/MissionRegistry';
import { missionLoader } from '@/game/missions/MissionLoader';

const TITLE_IMAGE_PATH = 'assets/title_screen.png';

function hasSaveData(slot: number): boolean {
  return !!localStorage.getItem(`save${slot}`);
}

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
    const baseX = 40;
    const baseY = 460;
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

    // === Play/Back button (changes based on state) ===
    buttons.push({
      x: baseX,
      y: baseY,
      width,
      height,
      label: this.showingSaveSlots ? 'Back' : 'Play',
      isHovered: false,
      onClick: () => {
        audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 4 });

        if (this.showingSaveSlots) {
          // Back to main menu
          this.showingSaveSlots = false;
          this.saveSlotButtons = [];
          this.buttons = this.createMainButtons();
        } else {
          // Show save slots
          this.showingSaveSlots = true;
          this.saveSlotButtons = this.createSaveSlotButtons();
          this.buttons = this.createMainButtons(); // Recreate to update button text/style
        }
      },
      style: this.showingSaveSlots ? backButtonStyle : sharedStyle
    });

    // === Credits button (always visible) ===
    buttons.push({
      x: baseX,
      y: baseY + (height + spacing),
      width,
      height,
      label: 'Credits',
      isHovered: false,
      onClick: () => {
        audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 4 });
        console.log('Credits clicked (not implemented)');
      },
      style: sharedStyle
    });

    return buttons;
  }

  private createSaveSlotButtons(): UIButton[] {
    const baseX = 260;
    const baseY = 460;
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

      // === Main save/load button ===
      buttons.push({
        x: baseX,
        y: baseY + (height + spacing) * slot,
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
        style: sharedStyle
      });

      // === Delete button if save exists ===
      if (hasData) {
        buttons.push({
          x: baseX + width + 12,
          y: baseY + (height + spacing) * slot,
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
          }
        });
      }
    }

    return buttons;
  }

  private createConfirmationButtons(): void {
    const confirmX = 320;
    const confirmY = 340;
    const width = 100;
    const height = 40;

    this.confirmationButtons = [
      {
        x: confirmX,
        y: confirmY,
        width,
        height,
        label: 'Yes',
        isHovered: false,
        onClick: () => {
          audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 4 });
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
        x: confirmX + width + 20,
        y: confirmY,
        width,
        height,
        label: 'No',
        isHovered: false,
        onClick: () => {
          audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 4 });
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
    this.inputManager.updateFrame();

    const { x, y } = this.inputManager.getMousePosition();
    const click = this.inputManager.wasMouseClicked();

    const activeButtons = this.confirmingDeleteSlot !== null
      ? this.confirmationButtons
      : [...this.buttons, ...this.saveSlotButtons];

    for (const button of activeButtons) {
      const { x: bx, y: by, width, height } = button;
      button.isHovered = x >= bx && x <= bx + width && y >= by && y <= by + height;

      if (click && button.isHovered) {
        button.onClick();
      }
    }
  };

  private render = (_dt: number) => {
    this.canvasManager.clearAll();

    const bgCtx = this.canvasManager.getContext('background');
    const uiCtx = this.canvasManager.getContext('ui');

    if (this.backgroundImage) {
      bgCtx.drawImage(this.backgroundImage, 0, 0, bgCtx.canvas.width, bgCtx.canvas.height);
    }

    // Always render main buttons (Play/Back and Credits)
    for (const button of this.buttons) {
      drawButton(uiCtx, button);
    }

    // Render save slot buttons when showing save slots
    if (this.showingSaveSlots) {
      for (const button of this.saveSlotButtons) {
        drawButton(uiCtx, button);
      }
    }

    if (this.confirmingDeleteSlot !== null) {
      drawWindow({
        ctx: uiCtx,
        x: 280,
        y: 280,
        width: 320,
        height: 120,
        title: 'Confirm Deletion',
        mouse: this.inputManager.getMousePosition(),
        clicked: this.inputManager.wasMouseClicked(),
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

      uiCtx.fillStyle = '#ff4444';
      uiCtx.font = '14px monospace';
      uiCtx.fillText('Erase this save file?', 300, 320);

      for (const button of this.confirmationButtons) {
        drawButton(uiCtx, button);
      }
    }

    const mouse = this.inputManager.getMousePosition();
    const cursor = getCrosshairCursorSprite();
    uiCtx.drawImage(
      cursor,
      mouse.x - cursor.width / 2,
      mouse.y - cursor.height / 2
    );
  };
}
