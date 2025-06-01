// src/scenes/hub/PassivesMenuSceneManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';

import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { getCursorSprite } from '@/rendering/cache/CursorSpriteCache';
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

    this.buttons = [
      {
        x: 20,
        y: 20,
        width: 100,
        height: 40,
        label: '← Back',
        isHovered: false,
        onClick: () => {
          this.stop();
          sceneManager.setScene('hub');
        },
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

    drawWindow(uiCtx, 100, 420, 440, 130, 'Passives Menu');

    for (const btn of this.buttons) {
      drawButton(uiCtx, btn);
    }

    const cursor = getCursorSprite();
    uiCtx.drawImage(cursor, x - cursor.width / 2, y - cursor.height / 2);
  };
}
