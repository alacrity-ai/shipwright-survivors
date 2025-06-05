// src/systems/dialogue/registry/scripts/00_marlaGreeting.ts

import type { DialogueScript } from '@/systems/dialogue/interfaces/DialogueScript';
import type { DialogueContext } from '@/systems/dialogue/interfaces/DialogueContext';

import { awaitCondition } from '@/systems/dialogue/utils/awaitCondition';

import { PlayerPassiveManager } from '@/game/player/PlayerPassiveManager';

import { flags } from '@/game/player/PlayerFlagManager';

export function createHubIntroductionScript(ctx: DialogueContext): DialogueScript {
  const { inputManager } = ctx;
  if (!inputManager) {
    throw new Error('Input manager is required for hub arrival dialogue');
  }

  return {
    id: 'hub-introduction-1',
    defaultMode: 'inPerson',
    events: [
      // === Marla's dead-eyed introduction to the hub ===
      {
        type: 'pause',
        durationMs: 500,
      },
      {
        type: 'line',
        speakerId: 'marla',
        text: "Welcome to HQ. Please do not mistake this for a place of safety. It is merely where the paperwork lives."
      },
      {
        type: 'line',
        speakerId: 'marla',
        text: "I'm Marla Thinx, Account Liaison. My role is to observe, log, and gently discourage noncompliance. Occasionally I blink."
      },
      {
        type: 'line',
        speakerId: 'marla',
        text: "Your continued operation has triggered a provisional classification of 'survivor'. Please do not interpret this as encouragement."
      },
      {
        type: 'line',
        speakerId: 'marla',
        text: "You've been assigned a docking alcove, a breakroom with two functioning chairs, and access to the Passive Allocation Terminal."
      },
      {
        type: 'line',
        speakerId: 'marla',
        text: "You are now eligible for one (1) certified enhancement. The intern will explain. He insisted."
      },
      // Wait
      {
        type: 'pause',
        durationMs: 500,
      },
      // === Rexor appears with manic energy ===
      {
        type: 'line',
        speakerId: 'rexor',
        text: "Hey! You're not soup! That's great news!"
      },
      {
        type: 'line',
        speakerId: 'rexor',
        text: "You got your first passive point. The terminal still thinks it's a coffee machine, but it'll work."
      },
      // Pause
      {
        type: 'line',
        speakerId: 'rexor',
        text: "Go poke it and pick something. Might even help you not die. Or at least die slightly slower."
      },
      // Set flag
      {
        type: 'command',
        run: () => {
          flags.set('hub.passive-terminal.unlocked');
          flags.set('hub.introduction-1.complete');
        },
      },
    ]
  }
}

export function createHubIntroductionScript2(ctx: DialogueContext): DialogueScript {
  const { inputManager } = ctx;
  if (!inputManager) {
    throw new Error('Input manager is required for hub arrival dialogue');
  }

  return {
    id: 'hub-introduction-2',
    defaultMode: 'inPerson',
    events: [
      // Lock input
      {
        type: 'command',
        run: () => {
          inputManager.disableInput();
        },
      },
      // Explain how to use the passive terminal
      // ShowUI
      // Wait 3 seconds
      {
        type: 'pause',
        durationMs: 2000,
      },
      {
        type: 'line',
        options: {
          textBoxAlpha: 1,
        },
        speakerId: 'rexor',
        text: "Pick a category—Offense, Defense, Utility. Then slap a point into whatever looks shiny."
      },
      {
        type: 'line',
        options: {
          textBoxAlpha: 1,
        },
        speakerId: 'rexor',
        text: "Each upgrade stacks up to three times. Click confirm to make it official and mildly irreversible."
      },
      // hide ui
      {
        type: 'hideUI',
      },
      // Unlock input
      {
        type: 'command',
        run: () => {
          inputManager.enableInput();
        },
      },
      {
        type: 'command',
        run: () => awaitCondition(() => PlayerPassiveManager.getInstance().hasAnyPassives()),
      },
      // show ui
      {
        type: 'showUI',
      },
      {
        type: 'line',
        speakerId: 'rexor',
        text: "Nice! You're now technically enhanced. Should make it slightly easier to extract value from volatile assets."
      },
      // Set complete
      {
        type: 'command',
        run: () => {
          flags.set('hub.introduction-2.complete');
        },
      },
    ]
  }
}

export function createHubIntroductionScript3(ctx: DialogueContext): DialogueScript {
  const { inputManager } = ctx;
  if (!inputManager) {
    throw new Error('Input manager is required for hub arrival dialogue');
  }

  return {
    id: 'hub-introduction-3',
    defaultMode: 'inPerson',
    events: [
      // === Marla, unfazed, assigns next mission ===
      {
        type: 'line',
        speakerId: 'marla',
        text: "Now that you've invested in personal development, you're eligible for further hazard deployment."
      },
      {
        type: 'line',
        speakerId: 'marla',
        text: "We've identified an unsanctioned scrapper cluster operating in Entropium-positive territory under Deep Void jurisdiction."
      },
      {
        type: 'line',
        speakerId: 'marla',
        text: "They are not employees. Their ships are not assets. Their existence constitutes a yield inefficiency."
      },
      {
        type: 'line',
        speakerId: 'marla',
        text: "Your directive is to reclaim all viable matter. Structural integrity is optional. Entropium output is not."
      },
      {
        type: 'line',
        speakerId: 'marla',
        text: "Proceed to the mission terminal. Further delays will be logged."
      },
      {
        type: 'command',
        run: () => {
          flags.set('hub.introduction-3.complete');
          flags.set('hub.mission-computer.unlocked');
          flags.set('hub.breakroom.unlocked');
          flags.set('mission.scrapper-revenant.unlocked');
        },
      },
    ]
  }
}
