// src/systems/galaxymap/types/LocationDefinition.ts

import type { Vec3 } from '@/systems/galaxymap/webgl/vectorUtils';

export interface LocationDefinition {
  id: string;
  name: string;
  position: Vec3;
  scale: number;
  color: Vec3;
  rotationSpeed: number;
  missionId: string; // This mission ID refers to the key in the mission definition, e.g. 'mission_001'
}


