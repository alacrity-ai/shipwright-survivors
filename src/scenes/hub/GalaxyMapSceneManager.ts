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
import { getAssetPath } from '@/shared/assetHelpers';

import { GalaxyMapController } from '@/systems/galaxymap/GalaxyMapController';

import { missionRegistry } from '@/game/missions/MissionRegistry';
import { missionLoader } from '@/game/missions/MissionLoader';
import { loadImage } from '@/shared/imageCache';

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
    
    // Play sound effect
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

    // == Back button, and others if added later
    for (const btn of this.buttons) {
      btn.isHovered =
        x >= btn.x && x <= btn.x + btn.width &&
        y >= btn.y && y <= btn.y + btn.height;

      handleButtonInteraction(btn, x, y, clicked, scale);
    }

    // == Selected location launch button
    const selectedLocation = this.galaxyMapController.getSelectedLocation();
    if (selectedLocation && selectedLocation.missionId) {
      const mission = missionRegistry[selectedLocation.missionId];
      if (!mission) return; // skip if mission doesn't exist

      this.selectedLocationLaunchButton = {
        x: (this.canvasManager.getContext('ui').canvas.width / 2 ) - (180 * scale),
        y: (this.canvasManager.getContext('ui').canvas.height / 2) + (140 * scale),
        width: 360,
        height: 40,
        label: `Launch "${mission.name}"`,
        isHovered: false,
        onClick: () => {
          audioManager.play('assets/sounds/sfx/ui/start_00.wav', 'sfx', { maxSimultaneous: 4 });
          missionLoader.setMission(mission);
          this.stop();
          sceneManager.fadeToScene('mission');
        },
        style: crtStyle
      };

      // Mission portrait image caching
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
    } else {
      this.selectedLocationLaunchButton = null;
    }

    if (this.selectedLocationLaunchButton) {
      const btn = this.selectedLocationLaunchButton;
      btn.isHovered = x >= btn.x && x <= btn.x + btn.width &&
                      y >= btn.y && y <= btn.y + btn.height;
      handleButtonInteraction(btn, x, y, clicked, scale);
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

    // Draw mission portrait if selected location has one
    const selectedLocation = this.galaxyMapController.getSelectedLocation();
    if (selectedLocation && selectedLocation.missionId) {
      const mission = missionRegistry[selectedLocation.missionId];
      if (mission && mission.missionPortrait) {
        const cached = this.missionPortraitCache.get(mission.missionPortrait);
        if (cached) {
          const canvas = uiCtx.canvas;
          const frameSize = 256 * scale;
          const frameMargin = 4 * scale;
          const imageSize = frameSize - (frameMargin * 2);
          const x1 = canvas.width / 2 - (imageSize / 2);
          const y1 = 180 * scale;
          drawCRTBox(uiCtx, {x: x1, y: y1, width: frameSize, height: frameSize });
          uiCtx.drawImage(cached, x1 + frameMargin, y1 + frameMargin, imageSize, imageSize); // example size & position
        }
      }
    }

    // Handle cursor graphics
    let cursor: HTMLCanvasElement = getCrosshairCursorSprite();

    const hovered = this.galaxyMapController.getHoveredLocation();
    const selected = this.galaxyMapController.getSelectedLocation();

    if (
      (hovered && !selected) ||
      (this.selectedLocationLaunchButton?.isHovered)
    ) {
      cursor = getHoveredCursorSprite();
    }

    drawCursor(uiCtx, cursor, x, y, scale);
  };
}
