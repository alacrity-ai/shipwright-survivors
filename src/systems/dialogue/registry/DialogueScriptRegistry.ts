// src/systems/dialogue/registry/DialogueScriptRegistry.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';
import type { DialogueContext } from '@/systems/dialogue/interfaces/DialogueContext';

import { createHubIntroductionScript, createHubIntroductionScript2, createHubIntroductionScript3 } from '@/systems/dialogue/scripts/00_hub_introduction';
import { createIntroBriefingScript } from '@/systems/dialogue/scripts/01_introBriefing';
import { createMissionGenericScript } from '@/systems/dialogue/scripts/02_missionGeneric';
import { createPlanetGenericScript } from '@/systems/dialogue/scripts/03_planet_generic';

type DialogueScriptFactory = (context: DialogueContext) => DialogueScript;

const dialogueScriptRegistry = new Map<string, DialogueScriptFactory>([
  ['hub-introduction-1', createHubIntroductionScript],
  ['hub-introduction-2', createHubIntroductionScript2],
  ['hub-introduction-3', createHubIntroductionScript3],
  ['intro-briefing', createIntroBriefingScript],
  ['mission-generic', createMissionGenericScript],
  ['planet-generic', createPlanetGenericScript],
]);

export function getDialogueScript(id: string, context: DialogueContext): DialogueScript | undefined {
  const factory = dialogueScriptRegistry.get(id);
  return factory ? factory(context) : undefined;
}