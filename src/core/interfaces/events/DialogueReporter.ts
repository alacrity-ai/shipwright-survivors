// src/core/interfaces/events/DialogueReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import type { DialogueEvent } from '@/systems/dialogue/interfaces/DialogueEvent';
import type { DialogueMode } from '@/systems/dialogue/interfaces/DialogueMode';

export function pauseDialogue(): void {
  GlobalEventBus.emit('dialogue:pause', undefined);
}

export function resumeDialogue(): void {
  GlobalEventBus.emit('dialogue:resume', undefined);
}

export function reportDialogueEvent(event: DialogueEvent): void {
  GlobalEventBus.emit('dialogue:event', event);
}

export function clearDialogueEvents(): void {
  GlobalEventBus.emit('dialogue:event:clear', undefined);
}

// === Prefab dialogue events

export function reportDialogueLine(
  speakerId: string,
  text: string,
  options?: {
    textColor?: string;
    textBoxAlpha?: number;
    font?: string;
    speed?: number;     // override charDelay
    pitchMod?: number;  // additional pitch shift
    mode?: DialogueMode;
    side?: 'left' | 'right';
  }
): void {
  reportDialogueEvent({ type: 'line', speakerId, text, options });
}
