// src/core/runtimeHelpers/handleEngineSound.ts

import { audioManager } from '@/audio/Audio';

export function handleEngineSound(
  isKeyWPressed: boolean,
  engineSoundPlaying: boolean
): boolean {
  const engineSoundPath = 'assets/sounds/sfx/ship/engine_loop_00.wav';

  if (isKeyWPressed && !engineSoundPlaying) {
    audioManager.startLoop(engineSoundPath, 'sfx', {
      volume: 1.0,
      pitch: 1.0,
      pan: 0,
    });
    return true;
  }

  if (!isKeyWPressed && engineSoundPlaying) {
    audioManager.stopLoop(engineSoundPath);
    return false;
  }

  return engineSoundPlaying;
}
