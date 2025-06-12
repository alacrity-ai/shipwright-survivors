// src/core/interfaces/EventTypes.ts

import type { IncidentMinimapMarker } from '@/systems/incidents/helpers/IncidentMinimapReporter';

// src/core/EventTypes.ts
export interface EventTypes {
  'incident:minimap:marker': IncidentMinimapMarker;
  'incident:minimap:clear': { id: string };
  'dialogue:pause': undefined;
  'dialogue:resume': undefined;
  'menu:opened': { id: string };
  'menu:closed': { id: string };
}
