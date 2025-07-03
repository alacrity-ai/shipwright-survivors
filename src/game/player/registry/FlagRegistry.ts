export const FlagRegistry = {
  'mission.mission_001.unlocked': {
    description: 'Unlocks the first mission in the campaign.',
  },
  'mission.mission_001.complete': {
    description: 'Marks the first mission as completed.',
  },
  'mission.mission_002.unlocked': {
    description: 'Unlocks the second mission.',
  },
  'mission.mission_002.complete': {
    description: 'Marks the second mission as completed.',
  },
  'mission.scrapper-revenant.unlocked': { // Deprecated flag
    description: 'Unlocks the third mission.',
  },
  'mission.mission_003_00.unlocked': {
    description: 'Unlocks the third mission.',
  },
  'mission.mission_003_00.complete': {
    description: 'Marks the third mission as completed.',
  },
  'mission.mission_004_00.unlocked': {
    description: 'Unlocks the fourth mission.',
  },
  'mission.mission_004_00.complete': {
    description: 'Marks the fourth mission as completed.',
  },
  'mission.mission_005_00.unlocked': {
    description: 'Unlocks the fifth mission.',
  },
  'mission.mission_005_00.complete': {
    description: 'Marks the fifth mission as completed.',
  },
  'mission.mission_006_00.unlocked': {
    description: 'Unlocks the sixth mission.',
  },
  'mission.mission_006_00.complete': {
    description: 'Marks the sixth mission as completed.',
  },
  'mission.intro-briefing.complete': {
    description: 'Marks the intro briefing as completed.',
  },
  'mission.intro-briefing.tradepost-closed': {
    description: 'Marks the tradepost as closed.',
  },
  'mission.intro-briefing.powerupMenuOpened': {
    description: 'Marks the powerup menu as opened.',
  },
  'mission.intro-briefing.powerupMenuClosed': {
    description: 'Marks the powerup menu as closed.',
  },
  'hub.mission-computer.unlocked': {
    description: 'Unlocks the mission computer in the hub.',
  },
  'hub.passive-terminal.unlocked': {
    description: 'Unlocks the passive terminal in the hub.',
  },
  'hub.breakroom.unlocked': {
    description: 'Unlocks the breakroom in the hub.',
  },
  'hub.introduction-1.complete': {
    description: 'Marks the first introduction dialogue as completed.',
  },
  'hub.introduction-2.complete': {
    description: 'Marks the second introduction dialogue as completed.',
  },
  'hub.introduction-3.complete': {
    description: 'Marks the third introduction dialogue as completed.',
  },
} as const;

export type FlagKey = keyof typeof FlagRegistry;
