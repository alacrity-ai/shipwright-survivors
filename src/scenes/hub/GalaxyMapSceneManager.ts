// src/scenes/hub/GalaxyMapSceneManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';

import { getUniformScaleFactor } from '@/config/view';
import { drawButton, UIButton, handleButtonInteraction } from '@/ui/primitives/UIButton';
import { drawCursor, getCrosshairCursorSprite, getHoveredCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { drawCRTBox } from '@/ui/primitives/CRTBox';
import { drawLabel } from '@/ui/primitives/UILabel';
import { getAssetPath } from '@/shared/assetHelpers';
import { loadImage } from '@/shared/imageCache';

import { GalaxyMapController } from '@/systems/galaxymap/GalaxyMapController';

import { missionRegistry } from '@/game/missions/MissionRegistry';
import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';

const BACKGROUND_PATH = 'assets/hub/backgrounds/scene_galaxy-map.png';

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

export class GalaxyMapSceneManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private galaxyMapController: GalaxyMapController;

  private backgroundImage: HTMLImageElement | null = null;

  private missionPortraitCache: Map<string, HTMLImageElement> = new Map();
  private currentlyLoadingPortraitId: string | null = null;

  private selectedLocationLaunchButton: UIButton | null = null;
  private currentMissionId: string | null = null;

  private buttons: UIButton[];

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager
  ) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;
    this.galaxyMapController = new GalaxyMapController(canvasManager, inputManager);

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
    this.galaxyMapController.initialize();
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();
    audioManager.playMusic({ file: 'assets/sounds/music/track_01_hub.mp3' });
    audioManager.play('assets/sounds/sfx/ui/galaxymap_00.wav', 'sfx', { maxSimultaneous: 1 });
  }

  stop() {
    this.galaxyMapController.destroy();
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
  }

  private update = () => {
    this.inputManager.updateFrame();
    const scale = getUniformScaleFactor();
    const { x, y } = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    this.galaxyMapController.update();

    for (const btn of this.buttons) {
      handleButtonInteraction(btn, x, y, clicked, scale);
    }

    const selectedLocation = this.galaxyMapController.getSelectedLocation();
    const missionId = selectedLocation?.missionId ?? null;

    if (missionId) {
      if (missionId !== this.currentMissionId) {
        const mission = missionRegistry[missionId];
        if (!mission) return;

        this.selectedLocationLaunchButton = {
          x: this.canvasManager.getContext('ui').canvas.width / 2 - (180 * scale),
          y: this.canvasManager.getContext('ui').canvas.height / 2 + (140 * scale),
          width: 360,
          height: 40,
          label: `Choose Loadout`,
          isHovered: false,
          wasHovered: false,
          onClick: () => {
            audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx', { maxSimultaneous: 4 });
            this.stop();
            sceneManager.fadeToScene('ship-selection', { mission });
          },
          style: crtStyle
        };

        this.currentMissionId = missionId;

        const portraitPath = mission.missionPortrait;
        if (portraitPath && !this.missionPortraitCache.has(portraitPath) && this.currentlyLoadingPortraitId !== portraitPath) {
          this.currentlyLoadingPortraitId = portraitPath;
          loadImage(getAssetPath(portraitPath)).then(img => {
            this.missionPortraitCache.set(portraitPath, img);
            this.currentlyLoadingPortraitId = null;
          }).catch(err => {
            console.warn(`Failed to load mission portrait: ${portraitPath}`, err);
            this.currentlyLoadingPortraitId = null;
          });
        }
      }

      // Handle button interaction only if it's visible
      if (this.selectedLocationLaunchButton) {
        handleButtonInteraction(this.selectedLocationLaunchButton, x, y, clicked, scale);
      }
    } else {
      this.selectedLocationLaunchButton = null;
      this.currentMissionId = null;
    }
  };

  private render = () => {
    this.canvasManager.clearAll();
    const scale = getUniformScaleFactor();
    const bgCtx = this.canvasManager.getContext('background');
    const uiCtx = this.canvasManager.getContext('ui');
    const { x, y } = this.inputManager.getMousePosition();

    if (this.backgroundImage) {
      bgCtx.drawImage(this.backgroundImage, 0, 0, bgCtx.canvas.width, bgCtx.canvas.height);
    }

    this.galaxyMapController.render();

    for (const btn of this.buttons) {
      drawButton(uiCtx, btn, scale);
    }

    if (this.selectedLocationLaunchButton) {
      drawButton(uiCtx, this.selectedLocationLaunchButton, scale);
    }

    const selectedLocation = this.galaxyMapController.getSelectedLocation();
    const mission = selectedLocation?.missionId ? missionRegistry[selectedLocation.missionId] : null;

    if (mission && mission.missionPortrait) {
      const cached = this.missionPortraitCache.get(mission.missionPortrait);
      if (cached) {
        const canvas = uiCtx.canvas;
        const frameSize = 256 * scale;
        const frameMargin = 4 * scale;
        const imageSize = frameSize - (frameMargin * 2);
        const x1 = canvas.width / 2 - (imageSize / 2);
        const y1 = 180 * scale;

        drawLabel(
          uiCtx,
          canvas.width / 2,
          y1 - (28 * scale),
          mission.name,
          {
            font: `${18 * scale}px monospace`,
            align: 'center',
            glow: true
          }
        );

        drawCRTBox(uiCtx, { x: x1, y: y1, width: frameSize, height: frameSize });
        uiCtx.drawImage(cached, x1 + frameMargin, y1 + frameMargin, imageSize, imageSize);
      }
    }

    let cursor = getCrosshairCursorSprite();
    const hovered = this.galaxyMapController.getHoveredLocation();
    const selected = this.galaxyMapController.getSelectedLocation();

    if ((hovered && !selected) || this.selectedLocationLaunchButton?.isHovered) {
      cursor = getHoveredCursorSprite();
    }

    drawCursor(uiCtx, cursor, x, y, scale);
  };
}
