// src/game/veil/interfaces/MutationOptions.ts

export type MutationOptions = {
  mutateShips?: boolean;
  mutationBlockTier?: number;
  mutationBlockCount?: [number, number];
  mutationIntervalSeconds?: number;
  mutatedShipKillLimit?: number;
};
