// src/core/interfaces/events/PlanetMenusReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import type { PlanetDefinition } from '@/game/planets/interfaces/PlanetDefinition';

export function openPlanetInteractionOptions(planetDefinition: PlanetDefinition): void {
  GlobalEventBus.emit('planet:interaction:options:open', { planetDefinition });
}

export function openJumpCastMenu(): void {
  GlobalEventBus.emit('jumpcast:menu:open', undefined);
}

export function initiateJump(x: number, y: number): void {
  GlobalEventBus.emit('jumpcast:initiate-jump', { x, y });
}

export function disableJump(): void {
  GlobalEventBus.emit('planet:interaction:options:disable-jump', undefined);
}

export function enableJump(): void {
  GlobalEventBus.emit('planet:interaction:options:enable-jump', undefined);
}

export function disableContracts(): void {
  GlobalEventBus.emit('planet:interaction:options:disable-contracts', undefined);
}

export function enableContracts(): void {
  GlobalEventBus.emit('planet:interaction:options:enable-contracts', undefined);
}
