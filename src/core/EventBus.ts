// src/core/EventBus.ts

import type { EventTypes } from '@/core/interfaces/EventTypes';

type EventHandler<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, any>> {
  private listeners = new Map<keyof Events, Set<EventHandler<any>>>();

  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners.get(event)?.forEach(handler => handler(payload));
  }
}

// Usage:
export const GlobalEventBus = new EventBus<EventTypes>();
