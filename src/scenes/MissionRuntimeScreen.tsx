// src/scenes/MissionRuntimeScreen.tsx

import { useEffect } from 'react';
import { EngineRuntime } from '@/core/EngineRuntime';

let runtime: EngineRuntime | null = null;
let alreadyInitialized = false; // 🔧 Module-level guard

export function MissionRuntimeScreen() {
  useEffect(() => {
    console.log('useEffect called in MissionRuntimeScreen');
    if (alreadyInitialized) return;
    alreadyInitialized = true;

    runtime = new EngineRuntime();
    runtime.start();

    return () => {
      // This unmount handler should only run on full scene transition
      runtime = null;
      alreadyInitialized = false;
    };
  }, []);

  return (
    <div id="canvas-root">
      <canvas id="background-canvas" />
      <canvas id="entity-canvas" />
      <canvas id="fx-canvas" />
      <canvas id="particles-canvas" />
      <canvas id="ui-canvas" />
      <canvas id="overlay-canvas" />
    </div>
  );
}
