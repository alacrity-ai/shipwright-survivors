// src/scenes/hub/BreakroomSceneManager.ts

import { DEFAULT_CONFIG } from '@/config/ui';

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';

import { getUniformScaleFactor } from '@/config/view';
import { drawButton, UIButton, handleButtonInteraction } from '@/ui/primitives/UIButton';
import { loadImage } from '@/shared/imageCache';

import { getDialogueScript } from '@/systems/dialogue/registry/DialogueScriptRegistry';
import { DialogueQueueManagerFactory } from '@/systems/dialogue/factories/DialogueQueueManagerFactory';
import type { DialogueQueueManager } from '@/systems/dialogue/DialogueQueueManager';

import { CursorRenderer } from '@/rendering/CursorRenderer';

const BACKGROUND_PATH = 'assets/hub/backgrounds/scene_break-room.png';

export class BreakroomSceneManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private cursorRenderer: CursorRenderer;
  private backgroundImage: HTMLImageElement | null = null;

  private buttons: UIButton[];
  private dialogueQueueManager: DialogueQueueManager | null = null;

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager
  ) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;

    this.cursorRenderer = new CursorRenderer(canvasManager, inputManager);

    const crtStyle = DEFAULT_CONFIG.button.style;

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

    // === Create and start the dialogue ===
    this.dialogueQueueManager = DialogueQueueManagerFactory.create();

    const script = getDialogueScript('test-script', {});
    if (script) {
      this.dialogueQueueManager.startScript(script);
    }

    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();
  }

  stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
    this.cursorRenderer.destroy();
  }

  private update = () => {
    this.inputManager.updateFrame();

    const { x, y } = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    // Dialogue Handling
    if (this.dialogueQueueManager?.isRunning()) {
      this.dialogueQueueManager.update(this.gameLoop.getDeltaTime());

      if (clicked) {
        this.dialogueQueueManager.skipOrAdvance();
      }

      return;
    }

    handleButtonInteraction(this.buttons[0], x, y, clicked, getUniformScaleFactor());
  };

  private render = () => {
    this.canvasManager.clearAll();

    const bgCtx = this.canvasManager.getContext('background');
    const uiCtx = this.canvasManager.getContext('ui');
    const overlayCtx = this.canvasManager.getContext('overlay');

    if (this.backgroundImage) {
      bgCtx.drawImage(this.backgroundImage, 0, 0, bgCtx.canvas.width, bgCtx.canvas.height);
    }

    if (!this.dialogueQueueManager?.isRunning()) {
      for (const btn of this.buttons) {
        drawButton(uiCtx, btn, getUniformScaleFactor());
      }
    }

    if (this.dialogueQueueManager) {
      this.dialogueQueueManager.render(overlayCtx);
    }

    this.cursorRenderer.render();
  };
}
