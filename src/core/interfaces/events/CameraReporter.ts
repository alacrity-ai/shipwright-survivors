// src/core/interfaces/events/CameraReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function shakeCamera(strength: number, duration: number, frequency: number, tag?: string): void {
  GlobalEventBus.emit('camera:shake', { strength, duration, frequency, tag });
}
