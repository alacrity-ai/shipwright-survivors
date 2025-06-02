// src/systems/dialogue/factories/DialogueOrchestratorFactory.ts

import { DialogueOrchestrator } from '@/systems/dialogue/DialogueOrchestrator';
import { PortraitRenderer } from '@/systems/dialogue/renderers/PortraitRenderer';
import { TextboxRenderer } from '@/systems/dialogue/renderers/TextboxRenderer';
import { RollingTextRenderer } from '@/systems/dialogue/renderers/RollingTextRenderer';
import { BlipAudioSynchronizer } from '@/systems/dialogue/audio/BlipAudioSynchronizer';
import { speakerVoiceRegistry } from '@/systems/dialogue/registry/SpeakerVoiceRegistry';
import { audioManager } from '@/audio/Audio';

export class DialogueOrchestratorFactory {
  static create(): DialogueOrchestrator {
    return new DialogueOrchestrator(
      new PortraitRenderer(),
      new TextboxRenderer(),
      new RollingTextRenderer(),
      new BlipAudioSynchronizer((file, options) => audioManager.play(file, 'dialogue', options)),
      speakerVoiceRegistry
    );
  }
}
