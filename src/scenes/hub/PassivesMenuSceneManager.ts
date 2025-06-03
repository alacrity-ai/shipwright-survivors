// src/scenes/hub/PassivesMenuSceneManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';

import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { getCrosshairCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { loadImage } from '@/shared/imageCache';

const BACKGROUND_PATH = 'assets/hub/backgrounds/scene_passives-menu.png';

export class PassivesMenuSceneManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private backgroundImage: HTMLImageElement | null = null;

  private buttons: UIButton[];

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager
  ) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;

    const crtStyle = {
      borderRadius: 10,
      alpha: 0.85,
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

    this.buttons = [
      {
        x: 20,
        y: 20,
        width: 120,
        height: 50,
        label: '← Back',
        isHovered: false,
        onClick: () => {
          audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 4 });
          this.stop();
          sceneManager.fadeToScene('hub');
        },
        style: crtStyle
      }
    ];
  }

  async start() {
    this.backgroundImage = await loadImage(BACKGROUND_PATH);
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();
  }

  stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
  }

  private update = () => {
    this.inputManager.updateFrame();

    const { x, y } = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    for (const btn of this.buttons) {
      btn.isHovered =
        x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height;

      if (clicked && btn.isHovered) {
        btn.onClick();
        break;
      }
    }
  };

  private render = () => {
    this.canvasManager.clearAll();

    const bgCtx = this.canvasManager.getContext('background');
    const uiCtx = this.canvasManager.getContext('ui');
    const { x, y } = this.inputManager.getMousePosition();

    if (this.backgroundImage) {
      bgCtx.drawImage(this.backgroundImage, 0, 0, bgCtx.canvas.width, bgCtx.canvas.height);
    }

    drawWindow({
      ctx: uiCtx,
      x: 275,
      y: 98,
      width: 885,
      height: 542,
      options: {
        alpha: 0.9,
        borderRadius: 60,
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

    for (const btn of this.buttons) {
      drawButton(uiCtx, btn);
    }

    const cursor = getCrosshairCursorSprite();
    uiCtx.drawImage(cursor, x - cursor.width / 2, y - cursor.height / 2);
  };
}
