// src/core/interfaces/events/TitleReporter.ts

import { GlobalEventBus } from '@/core/EventBus';
import { HorizontalAlignment } from '@/ui/overlays/TransientWordDisplay';

export function reportTitle(
  title: string,
  subtitle?: string,
  durationSeconds: number = 2.0,
  scale: number = 1.0,
  alignment: HorizontalAlignment = 'center',
  color: string = '#00ffff',
): void {
  GlobalEventBus.emit('title:show', { title, subtitle, durationSeconds, scale, alignment, color });
}
