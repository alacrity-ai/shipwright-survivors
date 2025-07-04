// src/game/blocks/BlockColorSchemes.ts

export const BLOCK_PICKUP_SPARK_COLOR_PALETTES: Array<string[]> = [
  ['#ffffff', '#ffffff', '#dddddd'],
  ['#ffffff', '#ffffff', '#dddddd'],
  ['#66ff66', '#33cc33', '#99ff99'],  // green
  ['#66ccff', '#3399ff', '#99ddff'],  // blue
  ['#cc88ff', '#9933ff', '#ddaaff'],  // purple
];

export const DEFAULT_EXPLOSION_SPARK_PALETTE: string[] = ['#ffdd00', '#ffaa00', '#ff6600', '#ff2200', '#ffffff'];

export const ENGINE_COLOR_PALETTES: Record<string, string[]> = {
  engine0: ['#ffeeb0', '#ffc04d', '#ffd966'], // pale fire yellow, rich fire orange, yellow-orange glow
  engine1: ['#ffeeb0', '#ffc04d', '#ffd966'],
  engine2: ['#66ff66', '#33cc33', '#99ff99'],  // green exhaust
  engine3: ['#66ccff', '#3399ff', '#99ddff'],  // blue exhaust
  engine4: ['#cc88ff', '#9933ff', '#ddaaff'],  // purple exhaust
};

export const TURRET_COLOR_PALETTES: Record<string, string[]> = {
  turret0: ['#ffff88', '#ffaa00', '#ffcc33'],
  turret1: ['#ff8888', '#ff3333', '#ffaaaa'], // alt red-orange
  turret2: ['#88ff88', '#33dd33', '#aaffaa'], // green
  turret3: ['#88ccff', '#3399ff', '#66ddff'], // blue
  turret4: ['#cc88ff', '#9933ff', '#ddaaff'], // purple
};

export const LASER_BEAM_COLORS: Record<string, string[]> = {
  laser0: ['#00CCFF', '#00FFFF', '#00faff'],        // legacy white core, pink body, crimson glow
  laser1: ['#00CCFF', '#00FFFF', '#00faff'],        // same as laser0 for compatibility
  laser2: ['#E6FFED', '#76FF03', '#33691E'],        // pale green core, electric green body, forest glow
  laser3: ['#F3E5F5', '#D500F9', '#4A148C'],        // lavender core, neon violet body, deep purple glow
};

export const SHIELD_COLOR_PALETTES: Record<string, string[]> = {
  shield0: ['#88ddff', '#44bbff', '#00aaff'], // cyan
  shield1: ['#88ddff', '#44bbff', '#00aaff'], // same
  shield2: ['#aaffaa', '#66dd66', '#22bb22'], // green
  shield3: ['#ffbbff', '#dd66dd', '#cc33cc'], // magenta
};

export const SHIELDED_BLOCK_HIGHLIGHT_COLOR_PALETTES: Record<string, string> = {
  shield0: 'rgba(100, 255, 255, 0.4)',  // cyan default
  shield1: 'rgba(100, 255, 255, 0.4)',  // cyan again
  shield2: 'rgba(91, 255, 91, 0.4)',  // soft green
  shield3: 'rgba(255, 86, 255, 0.4)',  // soft magenta
};

export const EXPLOSIVE_LANCE_COLOR_PALETTES: Record<string, string[]> = {
  explosiveLance0: ['#ffcc00', '#ff6600', '#cc2200'], // fiery orange
  explosiveLance1: ['#ffcc00', '#ff6600', '#cc2200'], // fiery orange
  explosiveLance2: ['#aaffaa', '#66dd66', '#228822'], // verdant green
  explosiveLance3: ['#ccccff', '#9999ff', '#4444aa'], // lavender/blue
  explosiveLance4: ['#ff66cc', '#ff3399', '#990066'], // pink/magenta
};

export const BLOCK_PICKUP_LIGHT_TIER_COLORS: Record<number, string> = {
  0: '#ffffff', // Tier 0 – white (for consistency)
  1: '#ffffff', // Tier 1 – neutral white
  2: '#00aa33', // Tier 2 – emerald green
  3: '#0033cc', // Tier 3 – cobalt blue
  4: '#6600cc', // Tier 4 – royal purple
  5: '#ffcc00', // Tier 5 – gold (optional)
  10: '#ff3366', // Cockpit tier – exotic pink-red (for story-critical parts)
};

export const BLOCK_TIER_COLORS: Record<number, string> = {
  0: '#A9A9A9', // Tier 0 – white (for consistency)
  1: '#A9A9A9', // Tier 1 – neutral white
  2: '#00aa33', // Tier 2 – emerald green
  3: '#0033cc', // Tier 3 – cobalt blue
  4: '#6600cc', // Tier 4 – royal purple
  5: '#ffcc00', // Tier 5 – gold (optional)
  10: '#ff3366', // Cockpit tier – exotic pink-red (for story-critical parts)
};

export const PICKUP_FLASH_COLORS: Record<string, string> = {
  currency: '#FFD700', // bright golden yellow (true "gold" pickup flash)
  repair:   '#FF4444', // bright lively red (more energizing than mint)
  block:    '#CC66FF', // keep base purple, tier overrides handled elsewhere
};
