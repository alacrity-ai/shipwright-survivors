import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';

import { getCursorSprite } from '@/rendering/cache/CursorSpriteCache';

import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { loadImage } from '@/shared/imageCache';

const TITLE_IMAGE_PATH = 'assets/title_screen.png';

export class TitleScreenManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private backgroundImage: HTMLImageElement | null = null;

  private button: UIButton = {
    x: 320,
    y: 360,
    width: 160,
    height: 40,
    label: 'New Game',
    isHovered: false,
    onClick: () => {
      this.stop();
      sceneManager.setScene('hub');
    },
  };

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager
  ) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;
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

  private update = (_dt: number) => {
    this.inputManager.updateFrame();

    const { x, y } = this.inputManager.getMousePosition();
    const { x: bx, y: by, width, height } = this.button;

    this.button.isHovered =
      x >= bx && x <= bx + width &&
      y >= by && y <= by + height;

    if (this.inputManager.wasMouseClicked() && this.button.isHovered) {
      this.button.onClick();
    }
  };

  private render = (_dt: number) => {
    this.canvasManager.clearAll();

    const bgCtx = this.canvasManager.getContext('background');
    const uiCtx = this.canvasManager.getContext('ui');

    if (this.backgroundImage) {
      bgCtx.drawImage(this.backgroundImage, 0, 0, bgCtx.canvas.width, bgCtx.canvas.height);
    }

    drawLabel(uiCtx, 320, 120, [
      { text: '🚀 Shipwright Survivors', color: '#ffc600' }
    ], { font: '32px sans-serif', align: 'center' });

    drawButton(uiCtx, this.button);
  
    // Draw cursor
    const mouse = this.inputManager.getMousePosition();
    const cursor = getCursorSprite();
    this.canvasManager.getContext('ui').drawImage(
      cursor,
      mouse.x - cursor.width / 2,
      mouse.y - cursor.height / 2
    );
  };
}
