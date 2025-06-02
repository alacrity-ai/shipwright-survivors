// src/systems/dialogue/interfaces/BlipTimelineEntry.ts

export interface BlipTimelineEntry {
  syllable: string;
  timestamp: number;
  duration: number;
  audioFile: string;
  pitch: number;
}
