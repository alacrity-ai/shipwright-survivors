// src/scenes/passives/PlayerPassiveSceneManager.ts

import { DEFAULT_CONFIG } from '@/config/ui';

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';

import { getUniformScaleFactor } from '@/config/view';
import { drawButton, UIButton, handleButtonInteraction } from '@/ui/primitives/UIButton';
import { drawCursor, getCrosshairCursorSprite, getHoveredCursorSprite } from '@/rendering/cache/CursorSpriteCache';

import { GalaxyBackgroundRenderer } from '@/rendering/unified/passes/scene/GalaxyBackgroundRenderer';

import { PlayerGlobalPassiveManager } from '@/game/player/PlayerGlobalPassiveManager';

// Contract to be implemented by your UI layer:
// - constructor(canvasManager: CanvasManager, inputManager: InputManager)
// - initialize(): Promise<void> | void
// - destroy(): void
// - update(dtSeconds: number): void
// - render(): void
// - isHoveringInteractive(): boolean
import { PassiveTreeUIController } from '@/game/passives/ui/PassiveTreeUIController';

const crtStyle = DEFAULT_CONFIG.button.style;

export class PlayerPassiveSceneManager {
  private readonly canvasManager: CanvasManager;
  private readonly gameLoop: GameLoop;
  private readonly inputManager: InputManager;

  private readonly overlayCtx: CanvasRenderingContext2D;

  private backgroundPass: GalaxyBackgroundRenderer | null = null;
  private passiveController: PassiveTreeUIController;

  private readonly buttons: UIButton[];

  // Accumulated timeline for background animation
  private elapsedSeconds = 0;

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager
  ) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;

    this.overlayCtx = canvasManager.getContext('overlay');

    this.passiveController = new PassiveTreeUIController(canvasManager, inputManager);

    // Safety: Always unlock root node
    const mgr = PlayerGlobalPassiveManager.getInstance();
    mgr.unlockNode('root-node');

    const gl = this.canvasManager.getWebGL2Context('unifiedgl2');
    this.backgroundPass = new GalaxyBackgroundRenderer(gl);
    this.backgroundPass.setColors(
      [0.03, 0.03, 0.01],
      [0.055, 0.03, 0.02],
      [0.04, 0.03, 0.01]
    );

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

  async start() {
    this.elapsedSeconds = 0;

    await this.passiveController.initialize?.();

    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();

    audioManager.playMusic({ file: 'assets/sounds/music/track_01_hub.mp3' });
    audioManager.play('assets/sounds/sfx/ui/galaxymap_00.wav', 'sfx', { maxSimultaneous: 1 });
  }

  stop() {
    this.passiveController.destroy();
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
    this.backgroundPass?.destroy();
  }

  // NOTE: dtSeconds is provided by GameLoop; do not compute it here.
  private update = (dtSeconds: number): void => {
    this.elapsedSeconds += dtSeconds;

    // Per-frame input
    this.inputManager.updateFrame();

    // Back button interaction
    const scale = getUniformScaleFactor();
    const { x, y } = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    for (const btn of this.buttons) {
      handleButtonInteraction(btn, x, y, clicked, scale);
    }

    // Passive tree UI
    this.passiveController.update(dtSeconds);
  };

  private render = (): void => {
    this.canvasManager.clearAll();

    const scale = getUniformScaleFactor();
    const uiCtx = this.overlayCtx;
    const { x, y } = this.inputManager.getMousePosition();

    // Background (same pass as GalaxyMap)
    this.backgroundPass?.render(this.elapsedSeconds);

    // Passive tree draw
    this.passiveController.render();

    // Back button
    for (const btn of this.buttons) {
      drawButton(uiCtx, btn, scale);
    }

    // Cursor (owned by scene manager)
    let cursor = getCrosshairCursorSprite();
    const hoveringInteractive = this.passiveController.isHoveringInteractive?.() || false;
    if (hoveringInteractive || this.buttons.some(b => b.isHovered)) {
      cursor = getHoveredCursorSprite();
    }

    if (!this.inputManager.isUsingGamepad?.()) {
      drawCursor(uiCtx, cursor, x, y, scale);
    }
  };
}
