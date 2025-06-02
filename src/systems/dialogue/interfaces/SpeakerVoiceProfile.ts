// src/systems/dialogue/interfaces/SpeakerVoiceProfile.ts

export interface SpeakerVoiceProfile {
  id: string;
  portrait: HTMLImageElement; // e.g. assets/characters/character_marla-thinx.png
  blipAudioFile: string; // e.g. assets/sounds/bleeps/girl_ah.wav
  basePitch: number;
  pitchVariance?: number;
  textSpeed?: number;
  syllableDuration?: number;
  portraitOffset?: { x: number; y: number };
  transmissionStyle?: boolean;
}
