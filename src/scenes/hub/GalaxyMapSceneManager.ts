// src/scenes/hub/GalaxyMapSceneManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';

import { getUniformScaleFactor } from '@/config/view';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawButton, UIButton, handleButtonInteraction } from '@/ui/primitives/UIButton';
import { drawCursor, getCrosshairCursorSprite } from '@/rendering/cache/CursorSpriteCache';

import { missionRegistry } from '@/game/missions/MissionRegistry';
import { missionLoader } from '@/game/missions/MissionLoader';
import { loadImage } from '@/shared/imageCache';

const BACKGROUND_PATH = 'assets/hub/backgrounds/scene_galaxy-map.png';

export class GalaxyMapSceneManager {
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

    const uiScale = getUniformScaleFactor();
    const buttonVerticalSpacing = 40 * uiScale;

    this.buttons = [
      {
        x: 120,
        y: 440 * uiScale,
        width: 360,
        height: 40,
        label: 'Launch "Tutorial Mission"',
        isHovered: false,
        onClick: () => {
          audioManager.play('assets/sounds/sfx/ui/start_00.wav', 'sfx', { maxSimultaneous: 4 });
          missionLoader.setMission(missionRegistry['mission_002']);
          this.stop();
          sceneManager.fadeToScene('mission');
        },
        style: crtStyle
      },
      {
        x: 120,
        y: (480 * uiScale) + buttonVerticalSpacing,
        width: 360,
        height: 40,
        label: 'Launch "Scrapyard Revenant"',
        isHovered: false,
        onClick: () => {
          missionLoader.setMission(missionRegistry['mission_003_00']);
          this.stop();
          sceneManager.fadeToScene('mission');
        },
        style: crtStyle
      },
      {
        x: 120,
        y: (520 * uiScale) + (buttonVerticalSpacing * 2),
        width: 360,
        height: 40,
        label: 'Launch "The Miner\'s Dillemma"',
        isHovered: false,
        onClick: () => {
          missionLoader.setMission(missionRegistry['mission_004_00']);
          this.stop();
          sceneManager.fadeToScene('mission');
        },
        style: crtStyle
      },
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

      handleButtonInteraction(btn, x, y, clicked, getUniformScaleFactor());
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
      x: 100,
      y: 400,
      width: 440,
      height: 130,
      title: 'Galaxy Map'
    });

    for (const btn of this.buttons) {
      drawButton(uiCtx, btn, getUniformScaleFactor());
    }

    const cursor = getCrosshairCursorSprite();
    drawCursor(uiCtx, cursor, x, y, getUniformScaleFactor());
  };
}
