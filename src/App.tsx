import { useEffect, useState } from 'react';
import { sceneManager, type Scene } from '@/core/SceneManager';
import { MissionRuntimeScreen } from '@/scenes/MissionRuntimeScreen';
import { audioManager } from '@/audio/Audio';
import { isElectron } from '@/shared/isElectron';
import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { applyViewportResolution } from '@/shared/applyViewportResolution';
import { SaveGameManager } from '@/core/save/saveGameManager';
import { checkWebGLSupport } from '@/lighting/webgl/helpers/checkWebGLSupport';
import { CanvasManager } from '@/core/CanvasManager';

export default function App() {
  const [scene, setScene] = useState<Scene>(sceneManager.getScene());

  useEffect(() => {
    // === Electron fullscreen toggle ===
    if (isElectron()) {
      window.electronAPI.toggleFullscreen();
    }

    // === WebGL support check ===
    const webglCheck = checkWebGLSupport();
    if (!webglCheck.supported) {
      console.error('WebGL is not supported on this device or browser. Lighting will not work.', webglCheck.error);
    }
    
    // === Apply stored resolution from save, if any ===
    const res = SaveGameManager.getFirstAvailableResolution();
    const settings = PlayerSettingsManager.getInstance();
    settings.setViewportWidth(res.width);
    settings.setViewportHeight(res.height);
    const canvasManager = CanvasManager.getInstance();
    
    // === Apply canvas dimensions immediately
    applyViewportResolution(canvasManager);

    // === Subscribe to resolution changes
    settings.onResolutionChange(() => {
      applyViewportResolution(canvasManager);
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
      <canvas id="polygon-canvas" />
      <canvas id="fx-canvas" />
      <canvas id="particles-canvas" />
      <canvas id="unifiedgl2-canvas" />
      <canvas id="ui-canvas" />
      <canvas id="overlay-canvas" />
      <canvas id="dialogue-canvas" />
      {scene === 'mission' && <MissionRuntimeScreen />}
    </div>
  );
}
