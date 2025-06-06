// src/scenes/MissionRuntimeScreen.tsx

// import { useEffect } from 'react';
// import { EngineRuntime } from '@/core/EngineRuntime';

// let runtime: EngineRuntime | null = null;

// export function MissionRuntimeScreen() {
//   useEffect(() => {
//     runtime = new EngineRuntime();
//     runtime.start();

//     return () => {
//       runtime = null;
//     };
//   }, []);

//   return null; // All rendering occurs in canvas, managed externally
// }

import { useEffect, useState } from 'react';
import { EngineRuntime } from '@/core/EngineRuntime';

let runtime: EngineRuntime | null = null;

export function MissionRuntimeScreen() {
  const [readyToFade, setReadyToFade] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      runtime = new EngineRuntime();

      try {
        await runtime.load(); // Block until everything critical is ready
        if (!cancelled) {
          runtime.start(); // Safe to begin runtime loop
          setReadyToFade(true); // Fade out black overlay
        }
      } catch (err) {
        console.error('Failed to load runtime assets:', err);
        // Optionally show error screen here
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
      runtime?.destroy();
      runtime = null;
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'black',
        transition: 'opacity 1.5s ease-in-out',
        opacity: readyToFade ? 0 : 1,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
