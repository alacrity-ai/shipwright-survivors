// src/core/interfaces/EventTypes.ts

import type { IncidentMinimapMarker } from '@/core/interfaces/events/IncidentMinimapReporter';
import type { FiringMode } from '@/systems/combat/types/WeaponTypes';

// src/core/EventTypes.ts
export interface EventTypes {
  'incident:minimap:marker': IncidentMinimapMarker;
  'incident:minimap:clear': { id: string };
  'dialogue:pause': undefined;
  'dialogue:resume': undefined;
  'menu:opened': { id: string };
  'menu:closed': { id: string };
  'camera:shake': { strength: number; duration: number; frequency?: number };
  'player:firemode:changed': { mode: FiringMode };
}
