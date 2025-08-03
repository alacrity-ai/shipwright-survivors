// src/game/boss/ai/bosses/flamelord/fsm/helpers/pickDialogue.ts

import { reportDialogueLine, clearDialogueEvents } from '@/core/interfaces/events/DialogueReporter';

const speakerId = 'crazy-moe';

const dialogueMap: Record<string, string[]> = {
  // AoE Detonation – aggressive tone
  DetonatePulse: [
    "Moe's cookin' up a sunburn for your soul!",
    "Gonna boil the bolts right off ya!",
    "I'm lightin' the fuse on your obituary!",
    "Busted coolant line!? I'm 'bout to blow!",
    "I'ma light you up like confetti!",
  ],

  // Frontal barrage – overwhelming firepower
  FrontalBarrage: [
    "Moe's servin' a buffet of ballistic regret!",
    "Here comes the core melter!",
    "This is Moe's version of a group hug!",
    "Keep flyin' straight, sweetheart—I aim in straight lines!",
    "Here's yer express ticket to scrap city!",
  ],

  // Minefield – area denial
  MinefieldDeploy: [
    "Hope you brought yer moon boots!",
    "Watch yer step, lunchbox!",
    "Tippy toe time! Heh heh hehhh!",
    "Every step you take... I'll be watchin' with a detonator!",
    "It's a Moe-nopoly board now—every tile's a boom!",
    "Scatter, scurry, squeal... it's all part o' the floor show!",
  ],

  // Dual flank flame
  Combo_LeftRightFlames: [
    "Yer left's on fire! Yer right's on fire!",
    "I got two hands and both got flamethrowers!",
    "I'm slicin' space like a rotisserie freakshow!",
    "No safe side now—you're in Moe's meat grinder!",
    "Flames to port, flames to starboard!",
  ],

  // Frontal + right flame
  Combo_FrontRightFlames: [
    "C'mere! Lemme warm ya up from the front and side!",
    "Betcha didn't know Moe could multitask like this!",
    "Flank and spank, baby!",
    "One-two combo! Right hook's molten!",
    "Catch the rest of my affection!",
  ],

  // Frontal + left flame
  Combo_FrontLeftFlames: [
    "Your starboard's toast!",
    "Moe's got angles! And they're all on fire!",
    "I'm comin' from the left but hittin' straight through your soul!",
    "Front's the bait, left's the grill!",
    "Ever danced with a welding torch in zero-G?",
  ],

  // Final phase
  FinalExam: [
    "TIME FOR YER FINAL EXAM—AND THE ONLY SUBJECT IS PAIN!",
    "She's all comin' down now, baby!",
    "No more tests. This one's the detonation thesis!",
    "The reaper's ridin' shotgun and I'm drivin' blind!",
    "Final phase, final blaze—I'ma write my name on yer wreckage!",
    "This is Moe unfiltered—pure grade-A thermonuclear spite!",
  ],

  // Default fallback
  default: [
    "Whatcha doin' in my orbit, lunchbox?",
    "Gonna pull yer spark plug with my teeth!",
    "You're trespassin' in Moe's scrap cathedral!",
    "Hey! You look like parts I ain't collected yet!",
    "I've welded smarter ships into toasters!",
    "Yer hull's lookin' mighty recyclable today!",
  ],
};


export function sayContextualDialogue(nextStateName: string): void {
  const lines = dialogueMap[nextStateName] ?? dialogueMap.default;
  const selected = lines[Math.floor(Math.random() * lines.length)];
  reportDialogueLine(speakerId, selected);
}

export function clearCrazyMoeDialogue(): void {
  clearDialogueEvents();
}
