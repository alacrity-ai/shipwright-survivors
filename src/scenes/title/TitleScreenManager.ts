// src/scenes/title/TitleScreenManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';

import { getCrosshairCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { loadImage } from '@/shared/imageCache';
import { missionRegistry } from '@/game/missions/MissionRegistry';
import { missionLoader } from '@/game/missions/MissionLoader';

const TITLE_IMAGE_PATH = 'assets/title_screen.png';

export class TitleScreenManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private backgroundImage: HTMLImageElement | null = null;

  private buttons: UIButton[] = [];

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager
  ) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;

    this.buttons = this.createButtons();
  }

  async start() {
    this.backgroundImage = await loadImage(TITLE_IMAGE_PATH);
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();
  }

  stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
  }

  private createButtons(): UIButton[] {
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

    return [
      {
        x: baseX,
        y: baseY,
        width,
        height,
        label: 'New Game',
        isHovered: false,
        onClick: () => {
          audioManager.play('assets/sounds/sfx/ui/start_00.wav', 'sfx');
          this.stop();
          missionLoader.setMission(missionRegistry['mission_001']);
          sceneManager.fadeToScene('mission');
        },
        style: sharedStyle
      },
      {
        x: baseX,
        y: baseY + height + spacing,
        width,
        height,
        label: 'Load Game',
        isHovered: false,
        onClick: () => {
          console.log('Load Game clicked (not implemented)');
        },
        style: sharedStyle
      },
      {
        x: baseX,
        y: baseY + (height + spacing) * 2,
        width,
        height,
        label: 'Credits',
        isHovered: false,
        onClick: () => {
          console.log('Credits clicked (not implemented)');
        },
        style: sharedStyle
      }
    ];
  }

  private update = (_dt: number) => {
    this.inputManager.updateFrame();

    const { x, y } = this.inputManager.getMousePosition();

    for (const button of this.buttons) {
      const { x: bx, y: by, width, height } = button;
      button.isHovered = x >= bx && x <= bx + width && y >= by && y <= by + height;

      if (this.inputManager.wasMouseClicked() && button.isHovered) {
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

    for (const button of this.buttons) {
      drawButton(uiCtx, button);
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
