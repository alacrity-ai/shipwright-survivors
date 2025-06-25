// src/scenes/hub/PassivesMenuSceneManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';

import { flags } from '@/game/player/PlayerFlagManager';
import { DialogueQueueManagerFactory } from '@/systems/dialogue/factories/DialogueQueueManagerFactory';
import { getDialogueScript } from '@/systems/dialogue/registry/DialogueScriptRegistry';
import type { DialogueQueueManager } from '@/systems/dialogue/DialogueQueueManager';

import { drawButton, UIButton, handleButtonInteraction } from '@/ui/primitives/UIButton';
import { drawCursor, getCrosshairCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { loadImage } from '@/shared/imageCache';

import { CRTMonitor } from '@/ui/primitives/CRTMonitor';
import { PassivesMenuIntroAnimationController } from '@/scenes/hub/passives_menu/PassivesMenuIntroAnimationController';
import { PassiveMenuManager } from '@/scenes/hub/passives_menu/PassiveMenuManager';
import { PlayerPassiveManager } from '@/game/player/PlayerPassiveManager';

import { scaleRect } from '@/config/virtualResolution';
import { getUniformScaleFactor } from '@/config/view';

const BACKGROUND_PATH = 'assets/hub/backgrounds/scene_passives-menu.png';

// === Virtual Coordinate Helpers ===

export class PassivesMenuSceneManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private backgroundImage: HTMLImageElement | null = null;
  private dialogueQueueManager: DialogueQueueManager | null = null;
  private buttons: UIButton[];
  private loopSoundStopped = false;

  private crtMonitor: CRTMonitor;
  private introAnimationController: PassivesMenuIntroAnimationController;

  private passiveMenuManager: PassiveMenuManager;

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

    const crtRect = scaleRect({ x: 275, y: 98, width: 885, height: 542 });
    this.crtMonitor = new CRTMonitor(crtRect.x, crtRect.y, crtRect.width, crtRect.height, {
      alpha: 0.95,
      borderRadius: 60,
      borderColor: '#00ff33',
      glowColor: '#00ff33',
      scanlineSpacing: 6,
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#000900' },
          { offset: 1, color: '#000000' }
        ]
      }
    });

    const passiveRect = scaleRect({ x: 285, y: 108, width: 865, height: 522 });
    this.passiveMenuManager = new PassiveMenuManager(
      this.inputManager,
      PlayerPassiveManager.getInstance(),
      passiveRect
    );

    this.introAnimationController = new PassivesMenuIntroAnimationController();
  }

  async start() {
    audioManager.startLoop('assets/sounds/sfx/ui/typing_00.wav', 'sfx', {
      volume: 1.0,
      pitch: 1.0,
      pan: 0,
    });

    this.backgroundImage = await loadImage(BACKGROUND_PATH);
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();

    this.dialogueQueueManager = DialogueQueueManagerFactory.create();
  }

  stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
  }

  private update = () => {
    const now = performance.now();
    this.inputManager.updateFrame();
    this.crtMonitor.update(now);
    this.introAnimationController.update(now);

    const { x, y } = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    if (!this.introAnimationController.isComplete()) return;

    if (
      this.dialogueQueueManager &&
      !this.dialogueQueueManager.isRunning() &&
      !flags.has('hub.introduction-2.complete')
    ) {
      const script = getDialogueScript('hub-introduction-2', { inputManager: this.inputManager });
      if (script) this.dialogueQueueManager.startScript(script);
    }

    if (this.dialogueQueueManager?.isRunning()) {
      this.dialogueQueueManager.update(this.gameLoop.getDeltaTime());
      if (clicked) this.dialogueQueueManager.skipOrAdvance();
    }

    for (const btn of this.buttons) {
      handleButtonInteraction(btn, x, y, clicked, getUniformScaleFactor());
    }

    // === Debugging ===
    // TODO : Remove on launch
    if (this.inputManager.wasKeyJustPressed('KeyP')) {
      PlayerPassiveManager.getInstance().addPassivePoints(1);
    }
    if (this.inputManager.wasKeyJustPressed('KeyR')) {
      PlayerPassiveManager.getInstance().refundAll();
    }

    this.passiveMenuManager.update();
  };

  private render = () => {
    this.canvasManager.clearAll();

    const bgCtx = this.canvasManager.getContext('background');
    const uiCtx = this.canvasManager.getContext('ui');
    const overlayCtx = this.canvasManager.getContext('overlay');
    const { x, y } = this.inputManager.getMousePosition();

    if (this.backgroundImage) {
      bgCtx.drawImage(this.backgroundImage, 0, 0, bgCtx.canvas.width, bgCtx.canvas.height);
    }

    this.crtMonitor.draw(uiCtx);

    if (!this.introAnimationController.isComplete()) {
      this.introAnimationController.draw(overlayCtx);
    } else {
      if (!this.loopSoundStopped) {
        audioManager.stopLoop('assets/sounds/sfx/ui/typing_00.wav');
        this.loopSoundStopped = true;
      }

      if (!this.dialogueQueueManager?.isRunning()) {
        for (const btn of this.buttons) {
          drawButton(uiCtx, btn, getUniformScaleFactor());
        }
      }

      if (this.dialogueQueueManager) {
        this.dialogueQueueManager.render(overlayCtx);
      }

      this.passiveMenuManager.render(uiCtx);
    }

    const cursor = getCrosshairCursorSprite();
    drawCursor(uiCtx, cursor, x, y, getUniformScaleFactor());
  };
}
