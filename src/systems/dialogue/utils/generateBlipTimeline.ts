// src/systems/dialogue/utils/generateBlipTimeline.ts

import type { SpeakerVoiceProfile } from '@/systems/dialogue/interfaces/SpeakerVoiceProfile';
import type { BlipTimelineEntry } from '@/systems/dialogue/interfaces/BlipTimelineEntry';
import { SyllableSegmenter } from '@/systems/dialogue/utils/SyllableSegmenter';

const segmenter = new SyllableSegmenter();

export function generateBlipTimeline(
  message: string,
  speaker: SpeakerVoiceProfile
): BlipTimelineEntry[] {
  const words = message.trim().split(/\s+/);
  const timeline: BlipTimelineEntry[] = [];

  let cursorMs = 0;
  const baseDurationMs = speaker.syllableDuration ?? 120;
  const pitchVariance = speaker.pitchVariance ?? 0;

  for (const word of words) {
    const syllables = segmenter.segment(word);
    for (const syllable of syllables) {
      const pitch = speaker.basePitch + pitchVariance * (Math.random() - 0.5);
      timeline.push({
        syllable,
        // Convert ms to seconds for compatibility with elapsedTime in update()
        timestamp: cursorMs / 1000,
        duration: baseDurationMs / 1000,
        audioFile: speaker.blipAudioFile,
        pitch,
      });
      cursorMs += baseDurationMs;
    }
    cursorMs += 80; // inter-word pause, still in ms
  }

  return timeline;
}
