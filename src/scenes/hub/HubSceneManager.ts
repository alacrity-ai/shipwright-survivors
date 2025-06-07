// src/scenes/hub/HubSceneManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';

import { getUniformScaleFactor } from '@/config/view';

import { flags } from '@/game/player/PlayerFlagManager';
import { DialogueQueueManagerFactory } from '@/systems/dialogue/factories/DialogueQueueManagerFactory';
import { getDialogueScript } from '@/systems/dialogue/registry/DialogueScriptRegistry';
import type { DialogueQueueManager } from '@/systems/dialogue/DialogueQueueManager';

import { SaveGameManager } from '@/core/save/saveGameManager';
import { drawCursor, getCrosshairCursorSprite, getHoveredCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { drawButton, UIButton, handleButtonInteraction } from '@/ui/primitives/UIButton';
import { loadImage } from '@/shared/imageCache';

import { scaleX, scaleY } from '@/config/virtualResolution';

const HUB_BACKGROUND_PATH = 'assets/hub/backgrounds/scene_main-room.png';

const INTERACTION_ZONES_VIRTUAL = {
  terminal: { x: 50, y: 280, width: 300, height: 360 },
  map: { x: 440, y: 160, width: 490, height: 380 },
  breakroom: { x: 970, y: 230, width: 230, height: 300 },
};

const INTERACTION_FLAGS = {
  terminal: 'hub.passive-terminal.unlocked',
  map: 'hub.mission-computer.unlocked',
  breakroom: 'hub.breakroom.unlocked',
} as const;

function scaleRect(rect: { x: number; y: number; width: number; height: number }) {
  return {
    x: scaleX(rect.x),
    y: scaleY(rect.y),
    width: scaleX(rect.width),
    height: scaleY(rect.height),
  };
}

export class HubSceneManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private backgroundImage: HTMLImageElement | null = null;
  private dialogueQueueManager: DialogueQueueManager | null = null;

  private isHoveringInteraction = false;

  private quitButton: UIButton;

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager
  ) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;

    this.quitButton = {
      x: 20,
      y: 20,
      width: 120,
      height: 50,
      label: '← Quit',
      isHovered: false,
      onClick: () => {
        this.stop();
        audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 1 });
        sceneManager.fadeToScene('title');
      },
      style: {
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
      }
    };
  }

  async start() {
    this.backgroundImage = await loadImage(HUB_BACKGROUND_PATH);
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();
    SaveGameManager.getInstance().saveAll();
    audioManager.playMusic({ file: 'assets/sounds/music/track_01_hub.mp3' });

    this.dialogueQueueManager = DialogueQueueManagerFactory.create();

    if (!flags.has('hub.introduction-1.complete')) {
      const script = getDialogueScript('hub-introduction-1', { inputManager: this.inputManager });
      if (script) {
        this.dialogueQueueManager.startScript(script);
      }
    } else if (flags.has('hub.introduction-1.complete') && flags.has('hub.introduction-2.complete') && !flags.has('hub.introduction-3.complete')) {
      const script = getDialogueScript('hub-introduction-3', { inputManager: this.inputManager });
      if (script) {
        this.dialogueQueueManager.startScript(script);
      }
    }
  }

  stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
  }

  private update = (_dt: number) => {
    this.inputManager.updateFrame();

    if (this.inputManager.wasKeyJustPressed('KeyF')) {
      flags.clear();
    }

    const m = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    if (this.dialogueQueueManager?.isRunning()) {
      this.dialogueQueueManager.update(this.gameLoop.getDeltaTime());
      if (clicked) this.dialogueQueueManager.skipOrAdvance();
      return;
    }

    const inZone = (zoneVirtual: { x: number; y: number; width: number; height: number }) => {
      const zone = scaleRect(zoneVirtual);
      return (
        m.x >= zone.x && m.x <= zone.x + zone.width &&
        m.y >= zone.y && m.y <= zone.y + zone.height
      );
    };

    this.isHoveringInteraction = Object.entries(INTERACTION_ZONES_VIRTUAL).some(
      ([key, zone]) =>
        inZone(zone) && flags.has(INTERACTION_FLAGS[key as keyof typeof INTERACTION_ZONES_VIRTUAL])
    );

    if (clicked) {
      audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 4 });

      if (inZone(INTERACTION_ZONES_VIRTUAL.terminal) && flags.has('hub.passive-terminal.unlocked')) {
        this.stop();
        sceneManager.fadeToScene('passives');
        return;
      } else if (inZone(INTERACTION_ZONES_VIRTUAL.map) && flags.has('hub.mission-computer.unlocked')) {
        this.stop();
        sceneManager.fadeToScene('galaxy');
        return;
      } else if (inZone(INTERACTION_ZONES_VIRTUAL.breakroom) && flags.has('hub.breakroom.unlocked')) {
        this.stop();
        sceneManager.fadeToScene('breakroom');
        return;
      }
    }

    handleButtonInteraction(this.quitButton, m.x, m.y, clicked, getUniformScaleFactor());
  };

  private render = (_dt: number) => {
    this.canvasManager.clearAll();

    const bgCtx = this.canvasManager.getContext('background');
    const uiCtx = this.canvasManager.getContext('ui');
    const m = this.inputManager.getMousePosition();

    if (this.backgroundImage) {
      bgCtx.drawImage(this.backgroundImage, 0, 0, bgCtx.canvas.width, bgCtx.canvas.height);
    }

    if (!this.dialogueQueueManager?.isRunning()) {
      drawButton(uiCtx, this.quitButton, getUniformScaleFactor());
    }

    if (this.dialogueQueueManager) {
      this.dialogueQueueManager.render(uiCtx);
    }

    const cursor = this.isHoveringInteraction
      ? getHoveredCursorSprite()
      : getCrosshairCursorSprite();

    drawCursor(uiCtx, cursor, m.x, m.y, getUniformScaleFactor());
    // this.drawInteractionZones(uiCtx);
  };

  private drawInteractionZones(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    for (const zone of Object.values(INTERACTION_ZONES_VIRTUAL)) {
      const scaled = scaleRect(zone);
      ctx.strokeRect(scaled.x, scaled.y, scaled.width, scaled.height);
    }
  }
}
