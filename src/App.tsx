import { useEffect, useState } from 'react';
import { sceneManager, type Scene } from '@/core/SceneManager';
import { MissionRuntimeScreen } from '@/scenes/MissionRuntimeScreen';
import { audioManager } from '@/audio/Audio';
import { isElectron } from '@/shared/isElectron';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { applyViewportResolution } from '@/shared/applyViewportResolution';

export default function App() {
  const [scene, setScene] = useState<Scene>(sceneManager.getScene());

  useEffect(() => {
    // === Fullscreen toggle for Electron ===
    if (isElectron()) {
      window.electronAPI.toggleFullscreen();
    }

    // === Audio unlock on first input ===
    const unlock = () => {
      audioManager.unlock();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });

    // === Subscribe to scene changes ===
    const unsubscribe = sceneManager.onSceneChange(setScene);

    // === Apply initial resolution to all canvas layers ===
    applyViewportResolution();

    // === Subscribe to resolution changes (optional) ===
    PlayerSettingsManager.getInstance().onResolutionChange(() => {
      applyViewportResolution();
    });

    // === Initialize scene after DOM has mounted ===
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
