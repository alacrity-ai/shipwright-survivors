// src/core/SceneManager.ts

import { CursorManager } from '@/shared/cursorManager';

export type Scene = 'title' | 'hub' | 'mission' | 'debriefing';

type SceneListener = (scene: Scene) => void;

/**
 * Singleton SceneManager controls global scene transitions between:
 * - Title screen
 * - Hub screen (with subviews for galaxy/passives/breakroom)
 * - Mission runtime
 */
class SceneManager {
  private currentScene: Scene = 'title';
  private listeners: Set<SceneListener> = new Set();

  /** Set the current scene and notify all subscribers */
  public setScene(scene: Scene): void {
    if (this.currentScene === scene) return; // avoid redundant updates
    this.currentScene = scene;

    // Hacky cursor management
    if (scene === 'mission') {
      CursorManager.hide();
    } else {
      CursorManager.show();
    }

    this.listeners.forEach(cb => cb(scene));
  }

  /** Get the current active scene */
  public getScene(): Scene {
    return this.currentScene;
  }

  /**
   * Subscribe to scene changes. Returns a disposer to remove the listener.
   */
  public onSceneChange(callback: SceneListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export const sceneManager = new SceneManager();
