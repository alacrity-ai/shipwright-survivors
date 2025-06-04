// src/scenes/hub/BreakRoomSceneManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';

import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { getCrosshairCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { loadImage } from '@/shared/imageCache';

import { flags } from '@/game/player/PlayerFlagManager';
import { DialogueQueueManagerFactory } from '@/systems/dialogue/factories/DialogueQueueManagerFactory';
import type { DialogueQueueManager } from '@/systems/dialogue/DialogueQueueManager';

const BACKGROUND_PATH = 'assets/hub/backgrounds/scene_break-room.png';

export class BreakroomSceneManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
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

    // === Create and start the dialogue ===
    this.dialogueQueueManager = DialogueQueueManagerFactory.create();

    // if (!flags.has('breakroom.marla-greeting.complete')) {
    //   const script = getDialogueScript('marla-greeting', {});
    //   if (script) {
    //     this.dialogueQueueManager.startScript(script);
    //   }
    // }
    // if (!flags.has('mission.vlox-attack.complete')) {
    //   const script = getDialogueScript('vlox-attack', this.inputManager);
    //   if (script) {
    //     this.dialogueQueueManager.startScript(script);
    //   }
    // }

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

    // Dialogue Handling
    if (this.dialogueQueueManager?.isRunning()) {
      // Skip all interaction and button logic if a dialogue is active
      this.dialogueQueueManager.update(this.gameLoop.getDeltaTime());

      // Allow skipping dialogue with click
      if (clicked) {
        this.dialogueQueueManager.skipOrAdvance();
      }

      return; // Prevent other interactions
    }

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
    const overlayCtx = this.canvasManager.getContext('overlay'); // Use overlay layer for dialogue

    const { x, y } = this.inputManager.getMousePosition();

    if (this.backgroundImage) {
      bgCtx.drawImage(this.backgroundImage, 0, 0, bgCtx.canvas.width, bgCtx.canvas.height);
    }

    if (!this.dialogueQueueManager?.isRunning()) {
      for (const btn of this.buttons) {
        drawButton(uiCtx, btn);
      }
    }

    if (this.dialogueQueueManager) {
      this.dialogueQueueManager.render(overlayCtx);
    }

    const cursor = getCrosshairCursorSprite();
    uiCtx.drawImage(cursor, x - cursor.width / 2, y - cursor.height / 2);
  };
}
