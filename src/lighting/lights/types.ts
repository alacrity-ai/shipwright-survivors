// src/lighting/lights/types.ts

/** Common RGBA color format as hex string */
export type LightColor = string; // e.g. "#ffcc00" or "#ffffff88"

/** Enum of supported light types for polymorphic dispatch */
export type LightType = 'point' | 'spot' | 'directional' | 'beam';

/** Enum of supported fade modes for lights */
export type LightFadeMode = 'linear' | 'delayed';

/** Base interface for all lights, independently of subtype */
export interface LightInstance {
  id: number;  // now a numeric handle
  x: number;
  y: number;
  radius: number;
  color: LightColor;
  intensity: number;
  life?: number;
  maxLife?: number;
  flicker?: boolean;
  expires?: boolean;
  type: LightType;
  animationPhase?: number;
  fadeMode?: LightFadeMode;
  tag?: string;
}

/** Specialized light with radial falloff */
export interface PointLightInstance extends LightInstance {
  type: 'point';
}

/** Specialized light with a directional cone (future) */
export interface SpotLightInstance extends LightInstance {
  type: 'spot';
  angle: number;      // direction in radians
  spread: number;     // cone angle in radians
  softness?: number;  // softness of cone edge (0 to 1)
}

/** Global directional light (ambient tone) */
export interface DirectionalLightInstance extends LightInstance {
  type: 'directional';
  angle: number;        // directional vector angle
  spread?: number;      // optional for sun arc
  ambientOnly?: boolean;
}

/** Unified discriminated union of all light types */
export type AnyLightInstance =
  | PointLightInstance
  | SpotLightInstance
  | DirectionalLightInstance;

