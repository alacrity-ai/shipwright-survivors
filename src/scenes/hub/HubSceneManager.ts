// src/scenes/hub/HubSceneManager.ts

import { DEFAULT_CONFIG } from '@/config/ui';

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';

import { getUniformScaleFactor } from '@/config/view';
import { getAssetPath } from '@/shared/assetHelpers';

import { flags } from '@/game/player/PlayerFlagManager';
import { PlayerShipCollection } from '@/game/player/PlayerShipCollection';
import { DialogueQueueManagerFactory } from '@/systems/dialogue/factories/DialogueQueueManagerFactory';
import { getDialogueScript } from '@/systems/dialogue/registry/DialogueScriptRegistry';
import type { DialogueQueueManager } from '@/systems/dialogue/DialogueQueueManager';

import { SaveGameManager } from '@/core/save/saveGameManager';
import { drawCursor, getCrosshairCursorSprite, getHoveredCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { drawButton, UIButton, handleButtonInteraction } from '@/ui/primitives/UIButton';

import { resetPlayerData } from '@/game/player/helpers/playerResetService';

import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';
import { NavPoint } from '@/core/input/interfaces/NavMap';

import { scaleRect } from '@/config/virtualResolution';
import { PlayerMetaCurrencyManager } from '@/game/player/PlayerMetaCurrencyManager';

import { SceneBackgroundRenderer } from '@/rendering/unified/passes/scene/SceneBackgroundRenderer';

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

export class HubSceneManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private dialogueQueueManager: DialogueQueueManager | null = null;

  private backgroundPass: SceneBackgroundRenderer | null = null;
  private isHoveringInteraction = false;

  private gamepadNavManager: GamepadMenuInteractionManager;
  private quitButton: UIButton;

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager
  ) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;

    // Use the 'main' GL canvas managed by CanvasManager
    const gl = this.canvasManager.getWebGL2Context('unifiedgl2');
    this.backgroundPass = new SceneBackgroundRenderer(gl);

    this.gamepadNavManager = new GamepadMenuInteractionManager(this.inputManager);

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
        resetPlayerData();
        sceneManager.fadeToScene('title');
      },
      style: DEFAULT_CONFIG.button.style
    };
  }

  private buildNavMap(): void {
    const navPoints: NavPoint[] = [];
    let defaultNavPoint: NavPoint | null = null;

    const zones = Object.entries(INTERACTION_ZONES_VIRTUAL);
    for (const [key, rect] of zones) {
      const scaled = scaleRect(rect);
      const centerX = scaled.x + scaled.width / 2;
      const centerY = scaled.y + scaled.height / 2;

      let gridX = 0;
      let gridY = 0;
      if (key === 'map') gridX = 1;
      if (key === 'breakroom') gridX = 2;

      const point: NavPoint = {
        gridX,
        gridY,
        screenX: centerX,
        screenY: centerY,
        isEnabled: true,
      };

      navPoints.push(point);

      if (flags.has(INTERACTION_FLAGS.map) && key === 'map') {
        defaultNavPoint = point;
      } else if (flags.has(INTERACTION_FLAGS.terminal) && key === 'terminal') {
        defaultNavPoint = point;
      }
    }

    this.gamepadNavManager.setNavMap(navPoints);

    const target = defaultNavPoint ?? navPoints.find(p => p.isEnabled);
    if (target) {
      this.gamepadNavManager.setCurrentGridPosition(target.gridX, target.gridY);
    }
  }

  async start() {
    await this.backgroundPass?.loadImage(getAssetPath('assets/hub/backgrounds/scene_main-room.png'));

    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();
    SaveGameManager.getInstance().saveAll();
    audioManager.playMusic({ file: 'assets/sounds/music/track_01_hub.mp3' });

    this.dialogueQueueManager = DialogueQueueManagerFactory.create();

    const playerShipCollection = PlayerShipCollection.getInstance();
    if (!playerShipCollection.isUnlocked('SW-1 Standard Issue')) {
      console.log('[UnlockableShipDefinition] Unlocking starter ship: SW-1 Standard Issue');
      playerShipCollection.discover('SW-1 Standard Issue');
      playerShipCollection.unlock('SW-1 Standard Issue');
    }

    // Debug: Unlock all for testing
    playerShipCollection.unlockAndDiscoverAll();
    playerShipCollection.masterAllShips();
    PlayerMetaCurrencyManager.getInstance().setMetaCurrency(100000);

    if (!flags.has('hub.introduction-1.complete')) {
      const script = getDialogueScript('hub-introduction-1', { inputManager: this.inputManager });
      if (script) this.dialogueQueueManager.startScript(script);
    } else if (flags.has('hub.introduction-1.complete') &&
               flags.has('hub.introduction-2.complete') &&
               !flags.has('hub.introduction-3.complete')) {
      const script = getDialogueScript('hub-introduction-3', { inputManager: this.inputManager });
      if (script) this.dialogueQueueManager.startScript(script);
    }

    this.buildNavMap();
  }

  stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
    this.backgroundPass?.destroy();
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

    this.gamepadNavManager.update();

    if (this.inputManager.isUsingGamepad?.()) {
      if (!this.gamepadNavManager.hasNavMap()) {
        this.buildNavMap();
      }
      if (this.inputManager.wasGamepadAliasJustPressed('B')) {
        this.quitButton.onClick?.();
      }
    } else {
      if (this.gamepadNavManager.hasNavMap()) {
        this.gamepadNavManager.clearNavMap();
      }
    }
  };

  private render = (_dt: number) => {
    this.canvasManager.clearAll(); // Even if this is commented out, background is not showing

    // Draw WebGL background instead of the background canvas
    this.backgroundPass?.render();

    const uiCtx = this.canvasManager.getContext('overlay');
    const m = this.inputManager.getMousePosition();

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
  };

  /** Debug overlay for zones */
  private drawInteractionZones(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    for (const zone of Object.values(INTERACTION_ZONES_VIRTUAL)) {
      const scaled = scaleRect(zone);
      ctx.strokeRect(scaled.x, scaled.y, scaled.width, scaled.height);
    }
  }
}
