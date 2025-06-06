// src/audio/utils/playSpatialSfx.ts

import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { AudioChannel } from '@/audio/AudioManager';
import { audioManager } from '@/audio/Audio';

type SpatialAudioOptions = {
  file: string;
  channel: AudioChannel;
  maxSimultaneous?: number;
  baseVolume?: number; // default 1.0
  pitchRange?: [number, number]; // e.g. [0.7, 1.0]
  volumeJitter?: number; // default 0.2
};

export function playSpatialSfx(
  emitterShip: CompositeBlockObject,
  listenerShip: CompositeBlockObject | null,
  {
    file,
    channel,
    maxSimultaneous = 5,
    baseVolume = 1.0,
    pitchRange = [0.7, 1.0],
    volumeJitter = 0.2,
  }: SpatialAudioOptions
): void {
  let pan = 0;
  let attenuation = 1;

  if (listenerShip && emitterShip !== listenerShip) {
    const emitterPos = emitterShip.getTransform().position;
    const listenerPos = listenerShip.getTransform().position;

    const dx = emitterPos.x - listenerPos.x;
    const dy = emitterPos.y - listenerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // === Distance attenuation ===
    const maxHearingDistance = 2450;
    const nearThreshold = 300;
    const linearAttenuation = Math.max(0, 1 - (dist - nearThreshold) / (maxHearingDistance - nearThreshold));
    attenuation = Math.min(1, linearAttenuation);

    // === Stereo pan based on horizontal offset ===
    pan = Math.max(-0.7, Math.min(0.7, dx / 300));
  }

  // === Early exit optimization: skip if volume is imperceptible ===
  const maxJitteredVolume = baseVolume * (1.0 - volumeJitter);
  const maxFinalVolume = maxJitteredVolume * attenuation;

  if (maxFinalVolume < 0.01) return;

  // === Now generate pitch and jittered volume ===
  const [minPitch, maxPitch] = pitchRange;
  const pitch = minPitch + Math.random() * (maxPitch - minPitch);
  const jitteredVolume = baseVolume * (1.0 - volumeJitter * Math.random());
  const finalVolume = jitteredVolume * attenuation;

  audioManager.play(file, channel, {
    pitch,
    volume: finalVolume,
    pan,
    maxSimultaneous,
  });
}
