// src/core/SceneManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { InputManager } from '@/core/InputManager';
import { GameLoop } from '@/core/GameLoop';

import { TitleScreenManager } from '@/scenes/title/TitleScreenManager';
import { HubSceneManager } from '@/scenes/hub/HubSceneManager';
import { DebriefingScreenManager } from '@/scenes/debriefing/DebriefingScreenManager';
import { GalaxyMapSceneManager } from '@/scenes/hub/GalaxyMapSceneManager';
import { PassivesMenuSceneManager } from '@/scenes/hub/PassivesMenuSceneManager';
import { BreakroomSceneManager } from '@/scenes/hub/BreakRoomSceneManager';

import { audioManager } from '@/audio/Audio';

export type Scene =
  | 'title'
  | 'hub'
  | 'galaxy'
  | 'passives'
  | 'breakroom'
  | 'mission'
  | 'debriefing';

type SceneListener = (scene: Scene) => void;

/**
 * SceneManager controls global scene transitions between:
 * - Title screen
 * - Hub screen (control room)
 * - Galaxy map screen
 * - Passives menu screen
 * - Breakroom screen
 * - Mission runtime
 * - Debriefing screen
 */
class SceneManager {
  private currentScene: Scene | null = null;
  private listeners: Set<SceneListener> = new Set();

  private canvasManager: CanvasManager | null = null;
  private inputManager: InputManager | null = null;
  private gameLoop = new GameLoop();
  private activeSceneManager: { stop(): void } | null = null;

  // Fading
  private fadeAlpha = 0;
  private isFading = false;
  private fadeDirection: 'in' | 'out' | null = null;
  private fadeDuration = 500; // ms
  private fadeStartTime = 0;
  private nextScene: Scene | null = null;

  constructor() {
    this.gameLoop.onRender(this.renderOverlay);
    this.gameLoop.onUpdate(this.updateFadeTransition);
  }

  private ensureCanvasManager(): CanvasManager {
    if (!this.canvasManager) {
      this.canvasManager = CanvasManager.getInstance();
    }
    return this.canvasManager;
  }

  private ensureInputManager(): InputManager {
    if (!this.inputManager) {
      if (!this.canvasManager) {
        this.canvasManager = this.ensureCanvasManager();
      }
      this.inputManager = new InputManager(this.canvasManager.getCanvas('ui'));
    }
    return this.inputManager;
  }

  private destroyTransientManagers(): void {
    if (this.inputManager) {
      this.inputManager.destroy();
      this.inputManager = null;
    }
    this.canvasManager = null;
  }

  public setScene(scene: Scene): void {
    // Guard to stop hanging loops from persisting across scenes
    audioManager.stopAllLoops();

    if (this.currentScene === scene) return;
    this.currentScene = scene;

    if (this.activeSceneManager) {
      this.activeSceneManager.stop();
      this.activeSceneManager = null;
    }

    switch (scene) {
      case 'title': {
        const mgr = new TitleScreenManager(
          this.ensureCanvasManager(),
          this.gameLoop,
          this.ensureInputManager()
        );
        mgr.start();
        this.activeSceneManager = mgr;
        break;
      }

      case 'hub': {
        const mgr = new HubSceneManager(
          this.ensureCanvasManager(),
          this.gameLoop,
          this.ensureInputManager()
        );
        mgr.start();
        this.activeSceneManager = mgr;
        break;
      }

      case 'galaxy': {
        const mgr = new GalaxyMapSceneManager(
          this.ensureCanvasManager(),
          this.gameLoop,
          this.ensureInputManager()
        );
        mgr.start();
        this.activeSceneManager = mgr;
        break;
      }

      case 'passives': {
        const mgr = new PassivesMenuSceneManager(
          this.ensureCanvasManager(),
          this.gameLoop,
          this.ensureInputManager()
        );
        mgr.start();
        this.activeSceneManager = mgr;
        break;
      }

      case 'breakroom': {
        const mgr = new BreakroomSceneManager(
          this.ensureCanvasManager(),
          this.gameLoop,
          this.ensureInputManager()
        );
        mgr.start();
        this.activeSceneManager = mgr;
        break;
      }

      case 'debriefing': {
        const mgr = new DebriefingScreenManager(
          this.ensureCanvasManager(),
          this.gameLoop,
          this.ensureInputManager()
        );
        mgr.start();
        this.activeSceneManager = mgr;
        break;
      }

      case 'mission': {
        this.destroyTransientManagers();
        break;
      }
    }

    this.listeners.forEach(cb => cb(scene));
  }

  public getScene(): Scene {
    return this.currentScene ?? 'title';
  }

  public onSceneChange(callback: SceneListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public getCanvasManager(): CanvasManager | null {
    return this.canvasManager;
  }

  public getInputManager(): InputManager | null {
    return this.inputManager;
  }

  public fadeToScene(scene: Scene): void {
    if (this.isFading) return; // Prevent overlapping transitions

    this.isFading = true;
    this.fadeAlpha = 0;
    this.fadeStartTime = performance.now();
    this.nextScene = scene;
  }

  private updateFadeTransition = (_dt: number): void => {
    if (!this.isFading) return;

    const now = performance.now();
    const elapsed = now - this.fadeStartTime;
    const t = Math.min(elapsed / this.fadeDuration, 1);
    this.fadeAlpha = t;

    if (t >= 1 && this.nextScene) {
      this.setScene(this.nextScene);

      // Immediately end fade
      this.isFading = false;
      this.fadeAlpha = 0;
      this.nextScene = null;
    }
  };

  private renderOverlay = (_dt: number): void => {
    if (!this.isFading || this.fadeAlpha <= 0) return;

    const ctx = this.canvasManager?.getContext('overlay');
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };
}

export const sceneManager = new SceneManager();
