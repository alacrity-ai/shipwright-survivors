// src/scenes/ship_selection/ShipSelectionSceneManager.ts

import { DEFAULT_CONFIG } from '@/config/ui';

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';
import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';

import { getUniformScaleFactor, isSteamDeck } from '@/config/view';
import { loadImage } from '@/shared/imageCache';

import { SceneBackgroundRenderer } from '@/rendering/unified/passes/scene/SceneBackgroundRenderer';
import { getAssetPath } from '@/shared/assetHelpers';

import { GlobalEventBus } from '@/core/EventBus';

import { drawButton, UIButton, handleButtonInteraction } from '@/ui/primitives/UIButton';
import { drawCursor, getCrosshairCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { drawLabel } from '@/ui/primitives/UILabel';

import { CoachMarkManager } from '@/rendering/coachmarks/CoachMarkManager';
import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';

import { initializeGL2BlockSpriteCache, destroyGL2BlockSpriteCache } from '@/rendering/cache/BlockSpriteCache';

import { ArtifactCollectionUIController } from '@/game/ship/artifacts/ui/ArtifactCollectionUIController'; // WE WILL NEED TO INTEGRATE THIS
import { ShipSelectionMenu } from '@/scenes/ship_selection/ShipSelectionMenu';

import { missionLoader } from '@/game/missions/MissionLoader';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import type { MissionDefinition } from '@/game/missions/types/MissionDefinition';
import type { CollectableShipDefinition } from '@/game/ship/interfaces/CollectableShipDefinition';

const BACKGROUND_PATH = 'assets/backgrounds/background_2_00.png';

const crtStyle = DEFAULT_CONFIG.button.style;

type ShipSelectionUIMode = 'ship-selection' | 'artifact-collection';

export class ShipSelectionSceneManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private gamepadNavManager: GamepadMenuInteractionManager;
  private backgroundPass: SceneBackgroundRenderer | null = null;

  private uiMode: ShipSelectionUIMode = 'ship-selection';
  private artifactCollectionController: ArtifactCollectionUIController | null = null;
  private artifactCollectionSlotIndex: 0 | 1 | 2 | null = null;

  private mission: MissionDefinition | null;

  private windowX: number;
  private windowY: number;
  private windowWidth: number;
  private windowHeight: number;

  private buttons: UIButton[];
  private launchButton: UIButton | null = null;
  private closeCollectionButton: UIButton | null = null;

  private skillTreeNavActive: boolean = false;

  private uiCtx: CanvasRenderingContext2D;
  private overlayCtx: CanvasRenderingContext2D;

  private selectedShipIndex: number = 0;
  private shipSelectionMenu: ShipSelectionMenu;

  private isSteamDeck: boolean = false;

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

    const gl = this.canvasManager.getWebGL2Context('unifiedgl2');
    this.backgroundPass = new SceneBackgroundRenderer(gl);
    
    this.isSteamDeck = isSteamDeck();

    const scale = getUniformScaleFactor();
    const viewportWidth = this.canvasManager.getCanvas('overlay').width;
    const viewportHeight = this.canvasManager.getCanvas('overlay').height;
    this.windowWidth = 1200 * scale;
    this.windowHeight = 560 * scale;
    this.windowX = (viewportWidth / 2) - (this.windowWidth / 2);
    this.windowY = (viewportHeight / 2) - (this.windowHeight / 2);

    this.uiCtx = this.canvasManager.getContext('overlay');
    this.overlayCtx = this.canvasManager.getContext('overlay');

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

    GlobalEventBus.on('ui:artifacts:collection-opened', this.handleOpenArtifactsCollection);
    GlobalEventBus.on('ui:artifacts:collection-closed', this.handleCloseArtifactsCollection);
  }

  private handleOpenArtifactsCollection = ({ slotIndex }: { slotIndex: 0 | 1 | 2 }) => {
    this.uiMode = 'artifact-collection';
    // this.selectedShipIndex = this.shipSelectionMenu.getSelectedIndex(); // Add this method
    this.skillTreeNavActive = false;
    this.artifactCollectionSlotIndex = slotIndex;

    const ship = this.getSelectedShip();
    this.artifactCollectionController = new ArtifactCollectionUIController(
      this.inputManager,
      ship.name,
      slotIndex
    );

    this.shipSelectionMenu.clearPreviewRenderer();
    this.rebuildNavMap(getUniformScaleFactor());
  };

  private handleCloseArtifactsCollection = () => {
    this.uiMode = 'ship-selection';
    this.artifactCollectionController = null;
    this.artifactCollectionSlotIndex = null;
    this.rebuildNavMap(getUniformScaleFactor());
  };

  launchMission(): void {
    if (!this.mission) return;

    audioManager.play('assets/sounds/sfx/ui/start_00.wav', 'sfx', { maxSimultaneous: 4 });
    PlayerShipCollection.getInstance().setActiveShip(this.getSelectedShip());
    missionLoader.setMission(this.mission!);
    this.stop();
    sceneManager.fadeToScene('mission');
  }

  async start() {
    initializeGL2BlockSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));

    await this.backgroundPass?.loadImage(getAssetPath(BACKGROUND_PATH));
    const scale = getUniformScaleFactor();

    if (this.mission) {
      this.launchButton = {
        x: this.canvasManager.getContext('overlay').canvas.width / 2 - (180 * scale),
        y: this.canvasManager.getContext('overlay').canvas.height - (58 * scale),
        width: 360,
        height: 40,
        label: `Launch "${this.mission.name}"`,
        isHovered: false,
        wasHovered: false,
        onClick: () => {
          this.launchMission();
        },
        style: crtStyle
      };
    }

    this.closeCollectionButton = {
      x: this.canvasManager.getContext('overlay').canvas.width / 2 - (180 * scale),
      y: this.canvasManager.getContext('overlay').canvas.height - (58 * scale),
      width: 360,
      height: 40,
      label: 'Close',
      isHovered: false,
      wasHovered: false,
      onClick: () => {
        this.handleCloseArtifactsCollection();
      },
      style: crtStyle
    };

    audioManager.playMusic({ file: 'assets/sounds/music/track_11_loadout.mp3' });
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();

    // === Show [Y] Coach Mark if gamepad is active ===
    const coachMarkManager = CoachMarkManager.getInstance();
    coachMarkManager.createScreenCoachMark(
      '',
      946,
      676,
      {
        type: 'gamepadFaceButton',
        label: 'Y',
        radius: 16,
        fontSize: 12,
        textColor: '#FFFFFF',
        fillColor: '#f9d600',
        borderColor: '#a58d00',
        highlightColor: '#ffff66',
        duration: Infinity,
      }
    );
  }

  stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
    this.shipSelectionMenu.destroy();
    this.gamepadNavManager.clearNavMap();
    destroyGL2BlockSpriteCache(this.canvasManager.getWebGL2Context('unifiedgl2'));
    CoachMarkManager.getInstance().clear();
    this.backgroundPass?.destroy();

    GlobalEventBus.off('ui:artifacts:collection-opened', this.handleOpenArtifactsCollection); // Needs to handle the options
    GlobalEventBus.off('ui:artifacts:collection-closed', this.handleCloseArtifactsCollection);
  }

  private getSelectedShip(): CollectableShipDefinition {
    const shipDef = this.shipSelectionMenu.getSelectedShip();
    if (!shipDef) throw new Error('No ship selected');
    return shipDef;
  }

  private update = (dt: number) => {
    const scale = getUniformScaleFactor();
    this.inputManager.updateFrame();
    CoachMarkManager.getInstance().update(dt);
    this.gamepadNavManager.update();

    // === DEBUG
    if (this.inputManager.wasKeyJustPressed('KeyM')) {
      PlayerShipCollection.getInstance().masterAllShips();
    }

    // === Mouse interaction ===
    const { x, y } = this.inputManager.getMousePosition();
    let clicked = this.inputManager.wasMouseClicked();

    // === Artifact Collection Mode ===
    if (this.uiMode === 'artifact-collection') {
      this.artifactCollectionController?.update();

      if (this.closeCollectionButton) {
        handleButtonInteraction(this.closeCollectionButton, x, y, clicked, scale);
      }
      clicked = false;
    }

    // === Gamepad bumper ship cycling ===
    if (this.inputManager.isUsingGamepad?.()) {
      let cycled = false;

      if (this.inputManager.wasGamepadAliasJustPressed('leftBumper')) {
        this.shipSelectionMenu.cycleSelectedShip(-1);
        cycled = true;
      } else if (this.inputManager.wasGamepadAliasJustPressed('rightBumper')) {
        this.shipSelectionMenu.cycleSelectedShip(1);
        cycled = true;
      }

      if (cycled) {
        this.shipSelectionMenu.update(0); // Crucial force update
        this.rebuildNavMap(scale);
      }
    }

    // === Handle nav mode toggle ===
    if (this.inputManager.wasGamepadAliasJustPressed('Y')) {
      this.skillTreeNavActive = !this.skillTreeNavActive;
      this.rebuildNavMap(scale);
      if (!this.skillTreeNavActive) {
        this.gamepadNavManager.setCurrentGridPosition(0, 1);
      }
    }

    // === Handle gamepad nav setup ===
    if (this.inputManager.isUsingGamepad?.()) {
      if (!this.gamepadNavManager.hasNavMap()) {
        this.rebuildNavMap(scale);
      }

      if (!this.skillTreeNavActive && this.inputManager.wasGamepadAliasJustPressed('B')) {
        if (this.uiMode === 'artifact-collection') {
          this.handleCloseArtifactsCollection();
          this.gamepadNavManager.setCurrentGridPosition(0, 1);
        } else {
          this.gamepadNavManager.setCurrentGridPosition(0, 0);
        }
      }

    } else {
      if (this.gamepadNavManager.hasNavMap()) {
        this.gamepadNavManager.clearNavMap();
      }
    }

    if (this.inputManager.gamepadAliasIsPressed('start')) {
      this.launchMission();
    }

    // === Submenu update ===
    if (this.uiMode === 'ship-selection') {
      this.shipSelectionMenu.update(dt);
    
      for (const btn of this.buttons) {
        handleButtonInteraction(btn, x, y, clicked, scale);
      }

      if (this.launchButton) {
        handleButtonInteraction(this.launchButton, x, y, clicked, scale);
      }
    }
  }

  private render = async () => {
    const scale = getUniformScaleFactor();
    this.canvasManager.clearAll();

    const { x, y } = this.inputManager.getMousePosition();

    this.backgroundPass?.render();

    // === Artifact Collection Mode ===
    if (this.uiMode === 'artifact-collection') {

      drawLabel(
        this.uiCtx,
        this.windowX + this.windowWidth / 2,
        this.windowY - (this.isSteamDeck ? 80 : 40 * scale),
        'Artifact Collection',
        {
          font: `${20 * scale}px monospace`,
          align: 'center',
          glow: true
        }
      );

      if (this.closeCollectionButton) {
        drawButton(this.uiCtx, this.closeCollectionButton, scale);
      }
    } else {
      // Back button
      for (const btn of this.buttons) {
        drawButton(this.uiCtx, btn, scale);
      }

      // Launch Button
      if (this.launchButton) {
        drawButton(this.uiCtx, this.launchButton, scale);
      }

      await this.shipSelectionMenu.render(this.uiCtx, this.overlayCtx);

      // Draw Coachmark Label
      if (InputDeviceTracker.getInstance().getLastUsed() === 'gamepad') {
        const label = this.skillTreeNavActive ? 'Select Ship' : 'Choose Loadout';
        CoachMarkManager.getInstance().render();
        drawLabel(
          this.uiCtx,
          996 * scale,
          668 * scale,
          label,
          {
            font: `${16 * scale}px monospace`,
            align: 'left',
          }
        );
      }
    }
    
    await this.artifactCollectionController?.render();
    
    if (!this.inputManager.isUsingGamepad()) {
      drawCursor(this.overlayCtx, getCrosshairCursorSprite(), x, y, scale);
    }
  }

  private rebuildNavMap(scale: number): void {
    if (this.uiMode === 'artifact-collection' && this.artifactCollectionController) {
      const navPoints = this.artifactCollectionController.getNavPoints();
      this.gamepadNavManager.setNavMap(navPoints);

      const firstEnabled = navPoints.find(p => p.isEnabled);
      if (firstEnabled) {
        this.gamepadNavManager.setCurrentGridPosition(firstEnabled.gridX, firstEnabled.gridY);
      }

    } else if (this.uiMode === 'ship-selection') {
      if (this.skillTreeNavActive) {
        const skillTreePoints = this.shipSelectionMenu.getSkillTreeNavPoints();
        const equipSlotPoints = this.shipSelectionMenu.getArtifactEquipNavPoints();

        // Offset skill tree nodes vertically to sit below equip slots
        const offsetSkillTreePoints = skillTreePoints.map(p => ({
          ...p,
          gridY: p.gridY + 1
        }));

        const combined = [...equipSlotPoints, ...offsetSkillTreePoints];
        this.gamepadNavManager.setNavMap(combined);

        const firstEnabled = combined.find(p => p.isEnabled);
        if (firstEnabled) {
          this.gamepadNavManager.setCurrentGridPosition(firstEnabled.gridX, firstEnabled.gridY);
        }

      } else {
        const navPoints = [];

        // Back button
        const backButton = this.buttons[0];
        navPoints.push({
          gridX: 0,
          gridY: 0,
          screenX: backButton.x + (backButton.width * scale) / 2,
          screenY: backButton.y + (backButton.height * scale) / 2,
          isEnabled: true,
        });

        // Color buttons
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

        // Launch button
        const launchGridX = 0;
        const launchGridY = 7;
        let launchButtonExists = false;

        if (this.launchButton) {
          navPoints.push({
            gridX: launchGridX,
            gridY: launchGridY,
            screenX: this.launchButton.x + (this.launchButton.width * scale) / 2,
            screenY: this.launchButton.y + (this.launchButton.height * scale) / 2,
            isEnabled: true,
          });
          launchButtonExists = true;
        }

        // Grid buttons
        navPoints.push(...this.shipSelectionMenu.getGridButtons());

        this.gamepadNavManager.setNavMap(navPoints);

        if (launchButtonExists) {
          this.gamepadNavManager.setCurrentGridPosition(launchGridX, launchGridY);
        } else {
          const firstEnabled = navPoints.find(p => p.isEnabled);
          if (firstEnabled) {
            this.gamepadNavManager.setCurrentGridPosition(firstEnabled.gridX, firstEnabled.gridY);
          }
        }
      }
    }
  }
}
