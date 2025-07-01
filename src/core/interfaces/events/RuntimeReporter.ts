// src/core/interfaces/events/RuntimeReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function pauseRuntime(): void {
  GlobalEventBus.emit('runtime:pause', undefined);
}

export function resumeRuntime(): void {
  GlobalEventBus.emit('runtime:resume', undefined);
}
