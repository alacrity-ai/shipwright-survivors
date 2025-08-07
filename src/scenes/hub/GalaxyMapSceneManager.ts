// src/scenes/hub/GalaxyMapSceneManager.ts

import { DEFAULT_CONFIG } from '@/config/ui';

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

import { GalaxyBackgroundRenderer } from '@/rendering/unified/passes/scene/GalaxyBackgroundRenderer';

import { GalaxyMapController } from '@/systems/galaxymap/GalaxyMapController';
import { missionUnlocked } from '@/systems/galaxymap/helpers/missionUnlocked';
import { missionRegistry } from '@/game/missions/MissionRegistry';

import { isSteamDeck } from '@/config/view';
import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';
import type { NavPoint } from '@/core/input/interfaces/NavMap';

const BACKGROUND_PATH = 'assets/backgrounds/background_4_00.png';
const crtStyle = DEFAULT_CONFIG.button.style;

export class GalaxyMapSceneManager {
  private canvasManager: CanvasManager;
  private overlayCtx: CanvasRenderingContext2D;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private galaxyMapController: GalaxyMapController;

  private backgroundPass: GalaxyBackgroundRenderer | null = null;
  
  private missionPortraitCache: Map<string, HTMLImageElement> = new Map();
  private currentlyLoadingPortraitId: string | null = null;

  private selectedLocationLaunchButton: UIButton | null = null;
  private currentMissionId: string | null = null;

  private buttons: UIButton[];

  private startTime: number = performance.now();

  private planetCoordsUnscaled: { x: number; y: number; missionId: string }[];
  private loadoutButtonCoord: { x: number; y: number };
  private gamepadNavManager: GamepadMenuInteractionManager;

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager
  ) {
    this.canvasManager = canvasManager;
    this.overlayCtx = canvasManager.getContext('overlay');
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;
    this.galaxyMapController = new GalaxyMapController(canvasManager, inputManager);
    this.gamepadNavManager = new GamepadMenuInteractionManager(inputManager);

    const gl = this.canvasManager.getWebGL2Context('unifiedgl2');
    this.backgroundPass = new GalaxyBackgroundRenderer(gl);

    // Hacky coordinate swapping for Steamdeck's higher screen
    this.planetCoordsUnscaled = this.getPlanetCoordsUnscaled();
    this.loadoutButtonCoord = isSteamDeck() ? { x: 643, y: 574 }: { x: 643, y: 519 };

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
          sceneManager.fadeToScene('title', { instantlyGoToSelectionMenu: true, postProcessEffect: 'cool' });
        },
        style: crtStyle
      }
    ];
  }

  // Hacky coordinate swapping for steamdeck's higher screen
  private getPlanetCoordsUnscaled() {
    if (!isSteamDeck()) {
      console.log('[GalaxyMapSceneManager] Non-Steam Deck detected, using default planet coords');
      return [
        { x: 262, y: 293, missionId: 'mission_005_00' },
        { x: 321, y: 504, missionId: 'mission_002' },
        { x: 645, y: 363, missionId: 'mission_006_00' },
        { x: 816, y: 198, missionId: 'mission_004_00' },
        { x: 991, y: 337, missionId: 'mission_003_00' },
      ];
    }
    console.log('[GalaxyMapSceneManager] Steam Deck detected, using Steam Deck planet coords');
    return [
      { x: 262, y: 293, missionId: 'mission_005_00' },
      { x: 271, y: 574, missionId: 'mission_002' },
      { x: 645, y: 363, missionId: 'mission_006_00' },
      { x: 816, y: 198, missionId: 'mission_004_00' },
      { x: 1011, y: 357, missionId: 'mission_003_00' },
    ];
  }

  async start() {
    this.galaxyMapController.initialize();
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();
    audioManager.playMusic({ file: 'assets/sounds/music/track_01_hub.mp3' });
    audioManager.play('assets/sounds/sfx/ui/galaxymap_00.wav', 'sfx', { maxSimultaneous: 1 });

    this.startTime = performance.now();

    await this.galaxyMapController.preloadTextures();
    this.buildNavMap(); // initialize nav map
  }

  stop() {
    this.galaxyMapController.destroy();
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
    this.gamepadNavManager.clearNavMap();
    this.backgroundPass?.destroy();
  }

  private buildNavMap(): void {
    const scale = getUniformScaleFactor();
    const navPoints: NavPoint[] = [];

    const selected = this.galaxyMapController.getSelectedLocation();

    if (selected) {
      // === Zoomed in, show nav only for launch button
      navPoints.push({
        gridX: 0,
        gridY: 0,
        screenX: this.loadoutButtonCoord.x * scale,
        screenY: this.loadoutButtonCoord.y * scale,
        isEnabled: true
      });
    } else {
      // === Not zoomed in, nav between *unlocked* planets only
      let unlockedIndex = 0;
      for (const coord of this.planetCoordsUnscaled) {
        if (!missionUnlocked(coord.missionId)) continue;

        navPoints.push({
          gridX: unlockedIndex % 3,
          gridY: Math.floor(unlockedIndex / 3),
          screenX: coord.x * scale,
          screenY: coord.y,
          isEnabled: true
        });

        unlockedIndex++;
      }
    }

    this.gamepadNavManager.setNavMap(navPoints);

    const first = navPoints.find(p => p.isEnabled);
    if (first) {
      this.gamepadNavManager.setCurrentGridPosition(first.gridX, first.gridY);
    }
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
          x: this.canvasManager.getContext('overlay').canvas.width / 2 - (180 * scale),
          y: this.canvasManager.getContext('overlay').canvas.height / 2 + (140 * scale),
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

        this.buildNavMap(); // Rebuild nav when zoomed in
      }

      if (this.selectedLocationLaunchButton) {
        handleButtonInteraction(this.selectedLocationLaunchButton, x, y, clicked, scale);
      }
    } else {
      if (this.currentMissionId) {
        this.buildNavMap(); // Rebuild nav when zoomed out
      }
      this.selectedLocationLaunchButton = null;
      this.currentMissionId = null;
    }

    // === Gamepad handling ===
    this.gamepadNavManager.update();

    if (this.inputManager.isUsingGamepad?.()) {
      if (!this.gamepadNavManager.hasNavMap()) {
        this.buildNavMap();
      }

      const { x: gx, y: gy } = this.gamepadNavManager.getCurrentGridPosition();
      const active = this['findNavPoint']?.(gx, gy) ?? null;

      const selected = this.galaxyMapController.getSelectedLocation();

      if (this.inputManager.wasGamepadAliasJustPressed('B')) {
        if (selected) {
          this.galaxyMapController.setSelectedLocation(null);
          audioManager.play('assets/sounds/sfx/ui/cancel_00.wav', 'sfx', { maxSimultaneous: 1 });
          this.buildNavMap();
        } else {
          this.buttons[0].onClick?.(); // Back button
        }
      }
    } else {
      if (this.gamepadNavManager.hasNavMap()) {
        this.gamepadNavManager.clearNavMap();
      }
    }
  };

  private render = () => {
    this.canvasManager.clearAll();
    const scale = getUniformScaleFactor();
    const uiCtx = this.canvasManager.getContext('overlay');
    const { x, y } = this.inputManager.getMousePosition();

    const timeSeconds = (performance.now() - this.startTime) / 1000;
    this.backgroundPass?.render(timeSeconds);

    this.galaxyMapController.render();

    // === Hovered label rendering ===
    const hovered = this.galaxyMapController.getHoveredLocation();
    const selected = this.galaxyMapController.getSelectedLocation();

    if (hovered && !selected) {
      const hoveredMissionId = hovered.missionId;
      const match = this.planetCoordsUnscaled.find(p => p.missionId === hoveredMissionId);
      if (match) {
        const labelX = match.x * scale;
        const labelY = match.y * scale;

        drawLabel(
          this.overlayCtx,
          labelX,
          labelY,
          hovered.name,
          {
            font: `${20 * scale}px monospace`,
            align: 'center',
            color: DEFAULT_CONFIG.general.accentColor
          }
        );
      }
    }

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

    if ((hovered && !selected) || this.selectedLocationLaunchButton?.isHovered) {
      cursor = getHoveredCursorSprite();
    }

    if (!this.inputManager.isUsingGamepad?.()) {
      drawCursor(uiCtx, cursor, x, y, scale);
    }
  };

  // Helper (optionally promote `findNavPoint` to a protected util or delegate to manager)
  private findNavPoint(x: number, y: number): NavPoint | undefined {
    return (this.gamepadNavManager as any).findNavPoint?.(x, y); // fallback if private
  }
}
