// src/core/EventBus.ts

type EventHandler<T = any> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off<T = any>(event: string, handler: EventHandler<T>): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit<T = any>(event: string, payload: T): void {
    this.listeners.get(event)?.forEach(handler => handler(payload));
  }
}

export const GlobalEventBus = new EventBus();
