This is my ship selection scenemanager:
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

import { ShipSelectionMenu } from '@/scenes/ship_selection/ShipSelectionMenu';
import { missionLoader } from '@/game/missions/MissionLoader';
import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';

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
  }

  private update = () => {
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

    this.shipSelectionMenu.update();
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


As you can see, it owns the ship selection menu:
This is the menu:
// src/scenes/ship_selection/ShipSelectionMenu.ts

import { getUniformScaleFactor } from '@/config/view';
import { CanvasManager } from '@/core/CanvasManager';
import { drawWindow } from '@/ui/primitives/WindowBox';
import { drawLabel } from '@/ui/primitives/UILabel';
import type { InputManager } from '@/core/InputManager';

export class ShipSelectionMenu {
  private canvasManager: CanvasManager;
  private inputManager: InputManager;

  // Window layout
  private windowX: number;
  private windowY: number;
  private windowWidth: number;
  private windowHeight: number;

  constructor(inputManager: InputManager) {
    this.canvasManager = CanvasManager.getInstance();
    this.inputManager = inputManager;

    const scale = getUniformScaleFactor();
    const viewportWidth = this.canvasManager.getCanvas('ui').width;
    const viewportHeight = this.canvasManager.getCanvas('ui').height;

    this.windowWidth = 1000 * scale;
    this.windowHeight = 500 * scale;
    this.windowX = (viewportWidth / 2) - (this.windowWidth / 2);
    this.windowY = (viewportHeight / 2) - (this.windowHeight / 2);
  }

  update(): void {
    // No-op for now — input and navigation to be implemented later
  }

  render(uiCtx: CanvasRenderingContext2D, _overlayCtx: CanvasRenderingContext2D): void {
    drawWindow({
      ctx: uiCtx,
      x: this.windowX,
      y: this.windowY,
      width: this.windowWidth,
      height: this.windowHeight,
      options: {
        alpha: 0.92,
        borderRadius: 12,
        borderColor: '#00ff33',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#001a00' },
            { offset: 1, color: '#000f00' }
          ]
        }
      }
    });

    drawLabel(
      uiCtx,
      this.windowX + this.windowWidth / 2,
      this.windowY + 20 * getUniformScaleFactor(),
      'Choose Your Starter Ship',
      {
        font: `${20 * getUniformScaleFactor()}px monospace`,
        align: 'center',
        glow: true
      }
    );
  }
}

Now to keep things modular, we're going to have components that the menu instantiates and owns and coordinates:

We'll put them in the components folder:
src/scenes/ship_selection/
├── ShipSelectionMenu.ts
├── ShipSelectionSceneManager.ts
└── components


This components will be the following:
PreviewShipComponent <-- will be a box that displays the selected ship as a preview
ShipSelectionGridComponent <-- This will be a grid of square image icons where we can select the ship (selection here will update the preview displayed as well)
EquippedArtifactsComponent <--- Will show two (maybe parameterize this) artifact slots, where each slot is an image icon (or an empty square if nothing is equipped).  This system will be just stubbed out for now, as it is not implemented at all.

So the flow is:
ShipSelectionMenu, draws the main window.  Runs the draw and update methods on its owned components, and can access things like currently selected ship, and equipped artifacts, etc.
Each component will have a render and update method exposed, so that the shipselectionmenu can run them.  THey will own the rendering and interaction of their domains, e.g. the grid of selectable ships, etc.

