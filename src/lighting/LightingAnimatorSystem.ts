// src/lighting/LightingAnimationSystem.ts

import type { LightSOA } from '@/lighting/interfaces/LightSOA';
import { FadeAnimation, PulseAnimation } from '@/lighting/interfaces/LightAnimations';

/**
 * Temporal animation controller for SOA-based point lights.
 * Applies fading and pulsing behavior to intensity or radius fields.
 */
export class LightAnimatorSystem {
  private readonly fadeAnimations: FadeAnimation[] = [];
  private readonly pulseAnimations: PulseAnimation[] = [];

  constructor(
    private readonly soa: LightSOA,
    private readonly idToIndex: Map<number, number>
  ) {}

  /**
   * Advances all active light animations by the given delta time (in seconds).
   */
  update(dt: number): void {
    this.updateFades(dt);
    this.updatePulses(dt);
  }

  /**
   * Queues a set of lights to fade their intensity or radius from a source value to a target value.
   */
  fadeLights(
    lightIds: Uint32Array,
    from: number,
    to: number,
    duration: number,
    field: 'intensity' | 'radius'
  ): void {
    for (let i = 0; i < lightIds.length; i++) {
      const id = lightIds[i];
      this.fadeAnimations.push(FadeAnimation.create(id, from, to, duration, field));
    }
  }

  /**
   * Queues a set of lights to pulse periodically using a sine wave.
   */
  pulseLights(
    lightIds: Uint32Array,
    base: number,
    amplitude: number,
    frequency: number,
    field: 'intensity' | 'radius'
  ): void {
    for (let i = 0; i < lightIds.length; i++) {
      const id = lightIds[i];
      this.pulseAnimations.push(PulseAnimation.create(id, base, amplitude, frequency, field));
    }
  }

  private updateFades(dt: number): void {
    const fades = this.fadeAnimations;
    const soa = this.soa;
    const idToIndex = this.idToIndex;

    for (let i = 0; i < fades.length; ) {
      const anim = fades[i];
      const index = idToIndex.get(anim.lightId);

      if (index == null || index < 0 || index >= soa.count) {
        fades[i] = fades[fades.length - 1];
        fades.pop();
        continue;
      }

      anim.elapsed += dt;
      const t = Math.min(anim.elapsed / anim.duration, 1.0);
      const value = anim.from + (anim.to - anim.from) * t;

      if (anim.field === 'intensity') {
        soa.intensity[index] = value;
      } else {
        soa.radius[index] = value;
      }

      if (t >= 1.0) {
        fades[i] = fades[fades.length - 1];
        fades.pop();
        continue;
      }

      i++;
    }
  }

  private updatePulses(dt: number): void {
    const pulses = this.pulseAnimations;
    const soa = this.soa;
    const idToIndex = this.idToIndex;

    for (let i = 0; i < pulses.length; ) {
      const anim = pulses[i];
      const index = idToIndex.get(anim.lightId);

      if (index == null || index < 0 || index >= soa.count) {
        pulses[i] = pulses[pulses.length - 1];
        pulses.pop();
        continue;
      }

      anim.phase += dt * anim.frequency * 2 * Math.PI;
      const value = anim.base + Math.sin(anim.phase) * anim.amplitude;

      if (anim.field === 'intensity') {
        soa.intensity[index] = value;
      } else {
        soa.radius[index] = value;
      }

      i++;
    }
  }

  /**
   * Stops any active pulse animations on the given light IDs.
   */
  stopPulsingLights(lightIds: Uint32Array): void {
    const set = new Set<number>();
    for (let i = 0; i < lightIds.length; i++) {
      set.add(lightIds[i]);
    }

    const pulses = this.pulseAnimations;
    for (let i = 0; i < pulses.length; ) {
      if (set.has(pulses[i].lightId)) {
        pulses[i] = pulses[pulses.length - 1];
        pulses.pop();
        continue;
      }
      i++;
    }
  }

  /**
   * Clears all queued animations. Useful during mission teardown.
   */
  clear(): void {
    this.fadeAnimations.length = 0;
    this.pulseAnimations.length = 0;
  }
}
