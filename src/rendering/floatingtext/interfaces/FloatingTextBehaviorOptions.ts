// src/rendering/floatingtext/interfaces/FloatingTextBehaviorOptions.ts

export interface FloatingTextBehaviorOptions {
  flashColor?: string;
  impactScale?: number;
  fadeOut?: boolean;
  multiColor?: boolean; // NEW: Whether to cycle through colors <--- This stopped working
  mergeWindowMs?: number; // NEW: How long to wait before merging with another channel
}
