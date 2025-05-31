// src/App.tsx

import { useEffect, useState } from 'react';
import { sceneManager, type Scene } from '@/core/SceneManager';

// SCENE ROOTS
import { TitleScreen } from '@/scenes/TitleScreen';
import { HubScreen } from '@/scenes/HubScreen';
import { MissionRuntimeScreen } from '@/scenes/MissionRuntimeScreen';
import { DebriefingScreen } from '@/scenes/DebriefingScreen';

export default function App() {
  const [scene, setScene] = useState<Scene>(sceneManager.getScene());

  useEffect(() => {
    const unsubscribe = sceneManager.onSceneChange(setScene);
    return () => unsubscribe();
  }, []);

  switch (scene) {
    case 'title':
      return <TitleScreen />;
    case 'hub':
      return <HubScreen />;
    case 'mission':
      return <MissionRuntimeScreen />;
    case 'debriefing':
      return <DebriefingScreen />;
    default:
      return <div>Error: Unknown scene `{scene}`</div>;
  }
}
