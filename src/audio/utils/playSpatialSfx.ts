import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { AudioChannel } from '@/audio/AudioManager';
import { audioManager } from '@/audio/Audio';

type SpatialAudioOptions = {
  file: string;
  channel: AudioChannel;
  maxSimultaneous?: number;
  baseVolume?: number;
  pitchRange?: [number, number];
  volumeJitter?: number;
};

const scratchAudioParams = { pitch: 0, volume: 0, pan: 0, maxSimultaneous: 0 };

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
    const emitterPos = emitterShip.getTransform().position; // ensure this is a persistent vector
    const listenerPos = listenerShip.getTransform().position;

    const dx = emitterPos.x - listenerPos.x;
    const dy = emitterPos.y - listenerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const maxHearingDistance = 2450;
    const nearThreshold = 300;
    const linearAttenuation = Math.max(0, 1 - (dist - nearThreshold) / (maxHearingDistance - nearThreshold));
    attenuation = linearAttenuation > 1 ? 1 : linearAttenuation;

    pan = Math.max(-0.7, Math.min(0.7, dx / 300));
  }

  const maxFinalVolume = baseVolume * (1.0 - volumeJitter) * attenuation;
  if (maxFinalVolume < 0.01) return;

  const minPitch = pitchRange[0];
  const maxPitch = pitchRange[1];
  scratchAudioParams.pitch = minPitch + Math.random() * (maxPitch - minPitch);
  scratchAudioParams.volume = baseVolume * (1.0 - volumeJitter * Math.random()) * attenuation;
  scratchAudioParams.pan = pan;
  scratchAudioParams.maxSimultaneous = maxSimultaneous;

  audioManager.play(file, channel, scratchAudioParams);
}
