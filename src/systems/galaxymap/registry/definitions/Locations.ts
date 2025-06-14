// src/systems/galaxymap/registry/definitions/Locations.ts

import type { LocationDefinition } from '@/systems/galaxymap/types/LocationDefinition';

import { vec3FromValues } from '@/systems/galaxymap/webgl/vectorUtils';

export const PLANETARY_LOCATIONS: LocationDefinition[] = [
  {
    id: 'casina',
    name: 'Casina System',
    position: vec3FromValues(-22, -10, 0),
    scale: 2.0,
    color: vec3FromValues(0.1, 0.4, 0.1), // Green
    rotationSpeed: -0.15,
    missionId: 'mission_002',
  },
  {
    id: 'naxos',
    name: 'Naxos System',
    position: vec3FromValues(32, 2, -20),
    scale: 4.0, // Star-scale mass
    color: vec3FromValues(0.4, 0.0, 0.0), // Dark red
    rotationSpeed: -0.3,
    missionId: 'mission_003_00',
  },
  {
    id: 'prexus',
    name: 'Prexus System',
    position: vec3FromValues(20, 18, -40),
    scale: 8.0, // Small scientific outpost
    color: vec3FromValues(0.8, 0.3, 0.9), // High-tech magenta/violet hue
    rotationSpeed: 0.3,
    missionId: 'mission_004_00',
  },
  {
    id: 'mitron',
    name: 'Mitron System',
    position: vec3FromValues(-30, 5, -10),
    scale: 7.0,
    color: vec3FromValues(0.2, 0.6, 1.0), // Earth-like blue with atmospheric tint
    rotationSpeed: 0.2,
    missionId: 'mission_005_00',
  },
  {
    id: 'solarum',
    name: 'Solarum System',
    position: vec3FromValues(0, 0, 0),
    scale: 9.0, // Star-scale mass
    color: vec3FromValues(1.0, 0.8, 0.1), // Radiant sun-yellow
    rotationSpeed: -0.1,
    missionId: 'mission_006_00',
  },
];
