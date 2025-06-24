// src/core/interfaces/events/IncidentReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function triggerIncident(script: string, tag: string, options?: Record<string, any>): void {
  GlobalEventBus.emit('incident:trigger', { script, tag, options });
}

export function clearIncident(tag: string): void {
  GlobalEventBus.emit('incident:clear', { tag });
}

/* Usage:
triggerIncident('CursedCargoIncident', 'incident:cache1', {
  x: 0,
  y: 0,
  rewardBlockTier: 2,
});

clearIncident('incident:cache1');
*/
