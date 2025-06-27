// src/core/interfaces/events/PlayerExperienceReporter.ts

import { GlobalEventBus } from "@/core/EventBus";
import type { PowerUpChoice } from "@/game/player/PlayerExperienceManager";

export function reportEntropiumAdded(amount: number): void {
  GlobalEventBus.emit('player:entropium:added', { amount });
}

export function reportEntropiumLevelUp(newLevel: number): void {
  GlobalEventBus.emit('player:entropium:levelup', { newLevel });
}

export function reportPowerupChosen(powerup: PowerUpChoice): void {
  GlobalEventBus.emit('player:powerup:chosen', { powerup });
}
