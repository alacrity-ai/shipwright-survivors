// src/scenes/ship_selection/ShipSelectionSceneManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';
import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';

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

const BACKGROUND_TILE_WIDTH = 1024 * getUniformScaleFactor();   // assuming 512px image width
const BACKGROUND_TILE_HEIGHT = 1024 * getUniformScaleFactor();  // assuming 512px image height
const BACKGROUND_SCROLL_SPEED = 60;  // pixels per second
const BACKGROUND_SCROLL_DIRECTION = { x: 1, y: 0 }; // vertical scroll

export class ShipSelectionSceneManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private gamepadNavManager: GamepadMenuInteractionManager;

  private mission: MissionDefinition | null;
  
  private backgroundImage: HTMLImageElement | null = null;
  private backgroundScrollOffsetY: number = 0;
  private backgroundScrollOffsetX: number = 0;

  private buttons: UIButton[];
  private launchButton: UIButton | null = null;

  private uiCtx: CanvasRenderingContext2D;
  private overlayCtx: CanvasRenderingContext2D;
  private bgCtx: CanvasRenderingContext2D;

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
    this.gamepadNavManager = new GamepadMenuInteractionManager(this.inputManager);
    this.mission = mission;

    this.uiCtx = this.canvasManager.getContext('ui');
    this.overlayCtx = this.canvasManager.getContext('overlay');
    this.bgCtx = this.canvasManager.getContext('background');

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
        y: this.canvasManager.getContext('ui').canvas.height - (58 * scale),
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

    audioManager.playMusic({ file: 'assets/sounds/music/track_11_loadout.mp3' });
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();
  }

  stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
    this.shipSelectionMenu.destroy();
    this.gamepadNavManager.clearNavMap();
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
    this.gamepadNavManager.update();

    // Scroll background image
    this.backgroundScrollOffsetX += BACKGROUND_SCROLL_DIRECTION.x * BACKGROUND_SCROLL_SPEED * dt;
    this.backgroundScrollOffsetY += BACKGROUND_SCROLL_DIRECTION.y * BACKGROUND_SCROLL_SPEED * dt;

    this.backgroundScrollOffsetX %= BACKGROUND_TILE_WIDTH;
    this.backgroundScrollOffsetY %= BACKGROUND_TILE_HEIGHT;

    // Handle Gamepad input
    if (this.inputManager.isUsingGamepad?.()) {
      if (!this.gamepadNavManager.hasNavMap()) {
        const scale = getUniformScaleFactor();
        const navPoints = [];

        const backButton = this.buttons[0];
        navPoints.push({
          gridX: 0,
          gridY: 0,
          screenX: backButton.x + (backButton.width * scale) / 2,
          screenY: backButton.y + (backButton.height * scale) / 2,
          isEnabled: true,
        });

        const [leftColorBtn, rightColorBtn] = this.shipSelectionMenu.getColorButtons();
        navPoints.push({
          gridX: 0,
          gridY: 6,
          screenX: leftColorBtn.x + (leftColorBtn.width * scale) / 2,
          screenY: leftColorBtn.y + (leftColorBtn.height * scale) / 2,
          isEnabled: true,
        });
        navPoints.push({
          gridX: 1,
          gridY: 6,
          screenX: rightColorBtn.x + (rightColorBtn.width * scale) / 2,
          screenY: rightColorBtn.y + (rightColorBtn.height * scale) / 2,
          isEnabled: true,
        });

        if (this.launchButton) {
          navPoints.push({
            gridX: 0,
            gridY: 7,
            screenX: this.launchButton.x + (this.launchButton.width * scale) / 2,
            screenY: this.launchButton.y + (this.launchButton.height * scale) / 2,
            isEnabled: true,
          });
        }

        // === Add grid tile nav points ===
        const gridButtons = this.shipSelectionMenu.getGridButtons();
        for (const point of gridButtons) {
          navPoints.push(point); // already in correct format
        }

        this.gamepadNavManager.setNavMap(navPoints);
        this.gamepadNavManager.setCurrentGridPosition(0, 7);
      }
      // Move to Back button if B is pressed
      if (this.inputManager.wasGamepadAliasJustPressed('B')) {
        this.gamepadNavManager.setCurrentGridPosition(0, 0);
      }
    } else {
      if (this.gamepadNavManager.hasNavMap()) {
        this.gamepadNavManager.clearNavMap();
      }
    }
    // End handle gamepadinput

    const { x, y } = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    for (const btn of this.buttons) {
      handleButtonInteraction(btn, x, y, clicked, scale);
    }

    if (this.launchButton) {
      handleButtonInteraction(this.launchButton, x, y, clicked, scale);
    }

    this.shipSelectionMenu.update(dt);
  }

  private render = () => {
    const scale = getUniformScaleFactor();
    this.canvasManager.clearAll();

    const { x, y } = this.inputManager.getMousePosition();

    if (this.backgroundImage) {
      this.drawScrollingBackgroundImage(
        this.bgCtx,
        this.backgroundImage,
        this.backgroundScrollOffsetX,
        this.backgroundScrollOffsetY
      );
    }

    for (const btn of this.buttons) {
      drawButton(this.uiCtx, btn, scale);
    }

    if (this.launchButton) {
      drawButton(this.uiCtx, this.launchButton, scale);
    }

    this.shipSelectionMenu.render(this.uiCtx, this.overlayCtx);

    if (!this.inputManager.isUsingGamepad()) {
      drawCursor(this.overlayCtx, getCrosshairCursorSprite(), x, y, scale);
    }
  }

  private drawScrollingBackgroundImage(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    offsetX: number,
    offsetY: number
  ): void {
    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;

    const tileWidth = BACKGROUND_TILE_WIDTH;
    const tileHeight = BACKGROUND_TILE_HEIGHT;

    const repeatX = Math.ceil(canvasWidth / tileWidth) + 1;
    const repeatY = Math.ceil(canvasHeight / tileHeight) + 1;

    for (let y = 0; y < repeatY; y++) {
      for (let x = 0; x < repeatX; x++) {
        ctx.drawImage(
          image,
          x * tileWidth - offsetX,
          y * tileHeight - offsetY,
          tileWidth,
          tileHeight
        );
      }
    }
  }
}
