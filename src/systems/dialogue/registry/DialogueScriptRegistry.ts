// src/systems/dialogue/registry/DialogueScriptRegistry.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';
import type { DialogueContext } from '@/systems/dialogue/interfaces/DialogueContext';

import { createMarlaGreetingScript } from '@/systems/dialogue/scripts/00_marlaGreeting';
import { createIntroBriefingScript } from '@/systems/dialogue/scripts/01_introBriefing';
import { createMissionGenericScript } from '@/systems/dialogue/scripts/02_missionGeneric';

type DialogueScriptFactory = (context: DialogueContext) => DialogueScript;

const dialogueScriptRegistry = new Map<string, DialogueScriptFactory>([
  ['marla-greeting', createMarlaGreetingScript],
  ['intro-briefing', createIntroBriefingScript],
  ['mission-generic', createMissionGenericScript],
]);

export function getDialogueScript(id: string, context: DialogueContext): DialogueScript | undefined {
  const factory = dialogueScriptRegistry.get(id);
  return factory ? factory(context) : undefined;
}