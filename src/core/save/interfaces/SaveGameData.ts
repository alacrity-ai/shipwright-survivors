interface SaveGameData {
  flags: string[];             // From PlayerFlagManager
  unlockedBlockIds: string[];  // From PlayerTechnologyManager
  passives?: any;              // Stubbed
  version?: number;            // For future compatibility
  metaCurrency?: any;          // Stubbed
}
