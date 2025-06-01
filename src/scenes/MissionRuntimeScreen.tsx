// src/scenes/MissionRuntimeScreen.tsx

import { useEffect } from 'react';
import { EngineRuntime } from '@/core/EngineRuntime';

let runtime: EngineRuntime | null = null;

export function MissionRuntimeScreen() {
  useEffect(() => {
    runtime = new EngineRuntime();
    runtime.start();

    return () => {
      runtime = null;
    };
  }, []);

  return null; // All rendering occurs in canvas, managed externally
}
