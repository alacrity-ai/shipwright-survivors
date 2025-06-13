// src/systems/incidents/helpers/IncidentMinimapReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export interface IncidentMinimapMarker {
  id: string;             // Unique ID for tracking/removal
  icon: string;           // e.g., 'skullAndBones', 'blackhole', 'beacon'
  x: number;
  y: number;
}

export function reportMinimapMarker(marker: IncidentMinimapMarker): void {
  GlobalEventBus.emit('incident:minimap:marker', marker);
}

export function clearMinimapMarker(id: string): void {
  GlobalEventBus.emit('incident:minimap:clear', { id });
}
