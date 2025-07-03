// src/core/interfaces/events/BlockDropDecisionMenuReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

/* Events:
  'blockdropdecision:refine:lock': undefined;
  'blockdropdecision:refine:unlock': undefined;
  'blockdropdecision:attach-all:lock': undefined;
  'blockdropdecision:attach-all:unlock': undefined;
  'blockdropdecision:attach:lock': undefined;
  'blockdropdecision:attach:unlock': undefined;
  'blockdropdecision:roll:lock': undefined;
  'blockdropdecision:roll:unlock': undefined;
  'blockdropdecision:lock-all': undefined;
  'blockdropdecision:unlock-all': undefined;
*/

export function lockRefineButton(): void {
  GlobalEventBus.emit('blockdropdecision:refine:lock', undefined);
}

export function unlockRefineButton(): void {
  GlobalEventBus.emit('blockdropdecision:refine:unlock', undefined);
}

export function lockAttachAllButton(): void {
  GlobalEventBus.emit('blockdropdecision:attach-all:lock', undefined);
}

export function unlockAttachAllButton(): void {
  GlobalEventBus.emit('blockdropdecision:attach-all:unlock', undefined);
}

export function lockAttachButton(): void {
  GlobalEventBus.emit('blockdropdecision:attach:lock', undefined);
}

export function unlockAttachButton(): void {
  GlobalEventBus.emit('blockdropdecision:attach:unlock', undefined);
}

export function lockRollButton(): void {
  GlobalEventBus.emit('blockdropdecision:roll:lock', undefined);
}

export function unlockRollButton(): void {
  GlobalEventBus.emit('blockdropdecision:roll:unlock', undefined);
}

export function lockAllButtons(): void {
  GlobalEventBus.emit('blockdropdecision:lock-all', undefined);
}

export function unlockAllButtons(): void {
  GlobalEventBus.emit('blockdropdecision:unlock-all', undefined);
}
