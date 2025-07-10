// src/game/ship/artifacts/helpers/playEquipSound.ts

import { audioManager } from "@/audio/Audio";

import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

const RARITY_TO_SOUND = {
  common: 'assets/sounds/sfx/ui/click_00.wav',
  uncommon: 'assets/sounds/sfx/debriefing/progressbar_wave.wav',
  rare: 'assets/sounds/sfx/magic/magic_poof.wav',
  epic: 'assets/sounds/sfx/pickups/rare_00.wav',
  legendary: 'assets/sounds/sfx/ui/gamblewin_02.wav',
};

export function playArtifactEquipSound(rarity: ArtifactDefinition['rarity']): void {
  const sound = RARITY_TO_SOUND[rarity] ?? RARITY_TO_SOUND.common;
  audioManager.play(sound, 'sfx', { maxSimultaneous: 8 });
}
