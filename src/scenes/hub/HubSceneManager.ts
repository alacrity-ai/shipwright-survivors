// src/scenes/hub/HubSceneManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';

import { getCursorSprite, getHoveredCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { loadImage } from '@/shared/imageCache';

const HUB_BACKGROUND_PATH = 'assets/hub/backgrounds/scene_main-room.png';

const INTERACTION_ZONES = {
  terminal: { x: 50, y: 280, width: 300, height: 360 },
  map: { x: 440, y: 160, width: 490, height: 380 },
  breakroom: { x: 970, y: 230, width: 230, height: 300 },
};

export class HubSceneManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private backgroundImage: HTMLImageElement | null = null;

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
      width: 100,
      height: 40,
      label: '← Quit',
      isHovered: false,
      onClick: () => {
        this.stop();
        sceneManager.setScene('title');
      },
      style: {
        borderRadius: 10,
        alpha: 0.85,
        borderColor: '#00ff00',
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
  }

  stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
  }

  private update = (_dt: number) => {
    this.inputManager.updateFrame();

    const m = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    const inZone = (zone: { x: number; y: number; width: number; height: number }) =>
      m.x >= zone.x && m.x <= zone.x + zone.width &&
      m.y >= zone.y && m.y <= zone.y + zone.height;

    // Detect hovering over any interaction zone
    this.isHoveringInteraction =
      inZone(INTERACTION_ZONES.terminal) ||
      inZone(INTERACTION_ZONES.map) ||
      inZone(INTERACTION_ZONES.breakroom);

    // Handle scene changes via click
    if (clicked) {
      if (inZone(INTERACTION_ZONES.terminal)) {
        this.stop();
        sceneManager.setScene('passives');
        return;
      } else if (inZone(INTERACTION_ZONES.map)) {
        this.stop();
        sceneManager.setScene('galaxy');
        return;
      } else if (inZone(INTERACTION_ZONES.breakroom)) {
        this.stop();
        sceneManager.setScene('breakroom');
        return;
      }
    }

    // Handle quit button hover/click
    const { x, y, width, height } = this.quitButton;
    this.quitButton.isHovered =
      m.x >= x && m.x <= x + width && m.y >= y && m.y <= y + height;

    if (clicked && this.quitButton.isHovered) {
      this.quitButton.onClick();
    }
  };

  private render = (_dt: number) => {
    this.canvasManager.clearAll();

    const bgCtx = this.canvasManager.getContext('background');
    const uiCtx = this.canvasManager.getContext('ui');
    const m = this.inputManager.getMousePosition();

    if (this.backgroundImage) {
      bgCtx.drawImage(this.backgroundImage, 0, 0, bgCtx.canvas.width, bgCtx.canvas.height);
    }

    drawButton(uiCtx, this.quitButton);
    // this.drawInteractionZones(uiCtx);

    const cursor = this.isHoveringInteraction
      ? getHoveredCursorSprite()
      : getCursorSprite();

    uiCtx.drawImage(cursor, m.x - cursor.width / 2, m.y - cursor.height / 2);
  };

  private drawInteractionZones(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    for (const zone of Object.values(INTERACTION_ZONES)) {
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    }
  }
}
