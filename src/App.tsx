// src/App.tsx

import { useEffect, useState } from 'react';
import { sceneManager, type Scene } from '@/core/SceneManager';
import { MissionRuntimeScreen } from '@/scenes/MissionRuntimeScreen';

export default function App() {
  const [scene, setScene] = useState<Scene>(sceneManager.getScene());

  useEffect(() => {
    const unsubscribe = sceneManager.onSceneChange(setScene);

    // ⬇️ Set initial scene AFTER canvas elements have mounted
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
      {scene === 'mission' && <MissionRuntimeScreen />}
    </div>
  );
}
