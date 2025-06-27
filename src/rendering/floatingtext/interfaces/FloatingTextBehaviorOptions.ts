// src/rendering/floatingtext/interfaces/FloatingTextBehaviorOptions.ts

export interface FloatingTextBehaviorOptions {
  flashColor?: string;
  impactScale?: number; // e.g., 1.5 for a "pop" effect at start
  fadeOut?: boolean;    // Whether to fade or not
  multiColor?: boolean; // NEW: Whether to cycle through colors 
}
