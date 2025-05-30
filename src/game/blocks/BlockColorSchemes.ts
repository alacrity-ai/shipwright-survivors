// src/game/blocks/BlockColorSchemes.ts

export const ENGINE_COLOR_PALETTES: Record<string, string[]> = {
  engine0: ['#fff', '#f90', '#ff0'],           // classic flame
  engine1: ['#fff', '#f90', '#ff0'],           // same as 0
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
