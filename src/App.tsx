import { useEffect, useState } from 'react';
import { sceneManager, type Scene } from '@/core/SceneManager';
import { MissionRuntimeScreen } from '@/scenes/MissionRuntimeScreen';
import { audioManager } from '@/audio/Audio';
import { isElectron } from '@/shared/isElectron';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { applyViewportResolution } from '@/shared/applyViewportResolution';
import { SaveGameManager } from '@/core/save/saveGameManager';

export default function App() {
  const [scene, setScene] = useState<Scene>(sceneManager.getScene());

  useEffect(() => {
    // === Electron fullscreen toggle ===
    if (isElectron()) {
      window.electronAPI.toggleFullscreen();
    }

    // === Apply stored resolution from save, if any ===
    const res = SaveGameManager.getFirstAvailableResolution();
    const settings = PlayerSettingsManager.getInstance();
    settings.setViewportWidth(res.width);
    settings.setViewportHeight(res.height);

    // === Apply canvas dimensions immediately
    applyViewportResolution();

    // === Subscribe to resolution changes
    settings.onResolutionChange(() => {
      applyViewportResolution();
    });

    // === Audio unlock on first pointer input ===
    const unlock = () => {
      audioManager.unlock();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });

    // === Scene change subscription
    const unsubscribe = sceneManager.onSceneChange(setScene);

    // === Kick off first scene after mount
    setTimeout(() => {
      sceneManager.setScene('title');
    }, 0);

    return () => unsubscribe();
  }, []);

  return (
    <div id="canvas-root">
      <canvas id="background-canvas" />
      <canvas id="entity-canvas" />
      <canvas id="fx-canvas" />
      <canvas id="particles-canvas" />
      <canvas id="ui-canvas" />
      <canvas id="overlay-canvas" />
      <canvas id="dialogue-canvas" />
      {scene === 'mission' && <MissionRuntimeScreen />}
    </div>
  );
}
