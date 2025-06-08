// src/lighting/lights/types.ts

/** Common RGBA color format as hex string */
export type LightColor = string; // e.g. "#ffcc00" or "#ffffff88"

/** Enum of supported light types for polymorphic dispatch */
export type LightType = 'point' | 'spot' | 'directional';

/** Base interface for all lights, independently of subtype */
export interface LightInstance {
  id: string;

  /** Light position in world space */
  x: number;
  y: number;

  /** Pixel radius in world space (before camera zoom applied) */
  radius: number;

  /** Light color (hex string, e.g., "#ffaa33") */
  color: LightColor;

  /** Scalar multiplier of brightness (1.0 = normal) */
  intensity: number;

  /** Optional life tracking for fading and expiration */
  life?: number;       // current remaining life (ms or s depending on unit convention)
  maxLife?: number;    // initial life span

  /** Optional flicker toggle (e.g., torches, fires) */
  flicker?: boolean;

  /** Optional: If true, this light is removed when life <= 0 */
  expires?: boolean;

  /** Light type for polymorphic interpretation */
  type: LightType;

  /** Optional animation state (interpolation, pulse, etc.) */
  animationPhase?: number; // between 0–1, updated by orchestrator if animated
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
