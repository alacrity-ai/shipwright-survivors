// src/lighting/interfaces/LightAnimations.ts

/**
 * Represents a linear fade animation applied to a light's intensity or radius.
 */
export class FadeAnimation {
  lightId: number = -1; // <-- Stable identifier
  from: number = 0;
  to: number = 0;
  duration: number = 0;
  elapsed: number = 0;
  field: 'intensity' | 'radius' = 'intensity';

  static create(
    lightId: number,
    from: number,
    to: number,
    duration: number,
    field: 'intensity' | 'radius'
  ): FadeAnimation {
    const inst = new FadeAnimation();
    inst.lightId = lightId;
    inst.from = from;
    inst.to = to;
    inst.duration = duration;
    inst.elapsed = 0;
    inst.field = field;
    return inst;
  }
}


/**
 * Represents a periodic pulsing animation applied to a light's intensity or radius.
 */
export class PulseAnimation {
  lightId: number = -1;
  amplitude: number = 0;
  frequency: number = 0;
  phase: number = 0;
  base: number = 0;
  field: 'intensity' | 'radius' = 'intensity';

  static create(
    lightId: number,
    base: number,
    amplitude: number,
    frequency: number,
    field: 'intensity' | 'radius'
  ): PulseAnimation {
    const inst = new PulseAnimation();
    inst.lightId = lightId;
    inst.base = base;
    inst.amplitude = amplitude;
    inst.frequency = frequency;
    inst.phase = 0;
    inst.field = field;
    return inst;
  }
}
