// src/core/interfaces/events/CameraReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function shakeCamera(strength: number, duration: number, frequency: number): void {
  GlobalEventBus.emit('camera:shake', { strength, duration, frequency });
}
