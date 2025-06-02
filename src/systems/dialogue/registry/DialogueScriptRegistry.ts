// src/systems/dialogue/registry/DialogueScriptRegistry.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';
import type { InputManager } from '@/core/InputManager';

import { marlaGreeting } from '@/systems/dialogue/scripts/00_marlaGreeting';
import { createIntroBriefingScript } from '@/systems/dialogue/scripts/01_introBriefing';

type DialogueScriptFactory = (inputManager: InputManager) => DialogueScript;

const dialogueScriptRegistry = new Map<string, DialogueScriptFactory>([
  ['marla-greeting', () => marlaGreeting],
  ['intro-briefing', createIntroBriefingScript],
]);

export function getDialogueScript(id: string, inputManager: InputManager): DialogueScript | undefined {
  const factory = dialogueScriptRegistry.get(id);
  return factory ? factory(inputManager) : undefined;
}
