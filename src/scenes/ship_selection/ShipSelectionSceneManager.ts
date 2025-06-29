// src/scenes/ship_selection/ShipSelectionSceneManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';

import { getUniformScaleFactor } from '@/config/view';
import { loadImage } from '@/shared/imageCache';

import { drawButton, UIButton, handleButtonInteraction } from '@/ui/primitives/UIButton';
import { drawCursor, getCrosshairCursorSprite } from '@/rendering/cache/CursorSpriteCache';

import { initializeGL2BlockSpriteCache, destroyGL2BlockSpriteCache } from '@/rendering/cache/BlockSpriteCache';

import { ShipSelectionMenu } from '@/scenes/ship_selection/ShipSelectionMenu';
import { missionLoader } from '@/game/missions/MissionLoader';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import type { CollectableShipDefinition } from '@/game/ship/interfaces/CollectableShipDefinition';

const BACKGROUND_PATH = 'assets/backgrounds/background_2_00.png';

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

export class ShipSelectionSceneManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;

  private mission: MissionDefinition | null;
  private backgroundImage: HTMLImageElement | null = null;

  private buttons: UIButton[];
  private launchButton: UIButton | null = null;

  private shipSelectionMenu: ShipSelectionMenu;

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager,
    mission: MissionDefinition | null
  ) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;
    this.mission = mission;

    this.shipSelectionMenu = new ShipSelectionMenu(this.inputManager);

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
          sceneManager.fadeToScene('galaxy');
        },
        style: crtStyle
      }
    ];
  }

  async start() {
    initializeGL2BlockSpriteCache(this.canvasManager.getWebGL2Context('gl2fx'));

    this.backgroundImage = await loadImage(BACKGROUND_PATH);

    if (this.mission) {
      const scale = getUniformScaleFactor();
      this.launchButton = {
        x: this.canvasManager.getContext('ui').canvas.width / 2 - (180 * scale),
        y: this.canvasManager.getContext('ui').canvas.height - (70 * scale),
        width: 360,
        height: 40,
        label: `Launch "${this.mission.name}"`,
        isHovered: false,
        wasHovered: false,
        onClick: () => {
          audioManager.play('assets/sounds/sfx/ui/start_00.wav', 'sfx', { maxSimultaneous: 4 });
          PlayerShipCollection.getInstance().setActiveShip(this.getSelectedShip());
          missionLoader.setMission(this.mission!);
          this.stop();
          sceneManager.fadeToScene('mission');
        },
        style: crtStyle
      };
    }

    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();
  }

  stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
    this.shipSelectionMenu.destroy();
    destroyGL2BlockSpriteCache(this.canvasManager.getWebGL2Context('gl2fx'));
  }

  private getSelectedShip(): CollectableShipDefinition {
    const shipDef = this.shipSelectionMenu.getSelectedShip();
    if (!shipDef) throw new Error('No ship selected');
    return shipDef;
  }

  private update = (dt: number) => {
    const scale = getUniformScaleFactor();
    this.inputManager.updateFrame();

    const { x, y } = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    for (const btn of this.buttons) {
      handleButtonInteraction(btn, x, y, clicked, scale);
    }

    if (this.launchButton) {
      handleButtonInteraction(this.launchButton, x, y, clicked, scale);
    }

    this.shipSelectionMenu.update(dt);
  };

  private render = () => {
    const scale = getUniformScaleFactor();
    this.canvasManager.clearAll();

    const bgCtx = this.canvasManager.getContext('background');
    const uiCtx = this.canvasManager.getContext('ui');
    const overlayCtx = this.canvasManager.getContext('overlay');
    const { x, y } = this.inputManager.getMousePosition();

    if (this.backgroundImage) {
      bgCtx.drawImage(this.backgroundImage, 0, 0, bgCtx.canvas.width, bgCtx.canvas.height);
    }

    for (const btn of this.buttons) {
      drawButton(uiCtx, btn, scale);
    }

    if (this.launchButton) {
      drawButton(uiCtx, this.launchButton, scale);
    }

    this.shipSelectionMenu.render(uiCtx, overlayCtx);

    drawCursor(uiCtx, getCrosshairCursorSprite(), x, y, scale);
  };
}
