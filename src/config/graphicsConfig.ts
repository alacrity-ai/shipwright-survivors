// src/shared/graphicsConfig.ts

// Renderer Pass Budgets
export const particleFrameBudgetMs = 2.5;
export const entityFrameBudgetMs = 4.0;
export const lightingFrameBudgetMs = 1.0; // Not used
export const postProcessFrameBudgetMs = 0.8; // Not used

// AI System Budget
export const aiSystemFrameBudgetMs = 1.2;

// Explosion System
export const explosionSystemFrameBudgetMs = 0.5;

// Ship Construction
export const constructionFrameBudgetMs = 0.5;

export const HEATSEEKER_SMOKE_PARTICLE_BUDGET_PER_FRAME = 20;   // Hard cap
export const HEATSEEKER_MIN_EMIT_PROBABILITY            = 0.05;  // Floor so “few seekers” still show trails
export const HEATSEEKER_MAX_EMIT_PROBABILITY            = 0.30;  // Ceiling to avoid screen-filling smoke

// Let's just not use this
export function getSafeUniformCount(gl: WebGL2RenderingContext): number {
  // Most Android devices have 64KB UBO limit
  return gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE) as number; // bytes
}

// PC with dedicate GPU
export const MAX_BLOCKS_GL = 8192;
export const MAX_LIGHTS_GL = 10000;
export const MAX_PARTICLES_GL = 30000;
export const MAX_SPRITES_GL = 10000;
export const MAX_FIRE_GL = 10000;
export const MAX_DAMAGE_TEXT_GL = 10000;
