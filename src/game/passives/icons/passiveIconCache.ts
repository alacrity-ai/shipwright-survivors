// src/game/passives/icons/passiveIconCache.ts

import { createCanvas, drawIconBase } from '@/game/ship/skills/icons/helpers/drawIconBase'; // Borrowed from ship skills

/**
 * Passive Icon Cache
 * - Uniform 24x24 canvas sprites (same as ship skill tree cache)
 * - Minimal initial set; extensible via initializePassiveIconCache()
 */

let iconCache: Record<string, HTMLCanvasElement> | null = null;

/** Magenta error-tile fallback (visible in dev) */
const fallbackSprite: HTMLCanvasElement = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(0, 0, 24, 24);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 22, 22);
  return canvas;
})();

/** === Icon Drawers (24x24) ===
 * Shapes are deliberately simple, bold, and readable at small size.
 * Colors chosen per spec; tweak as your palette evolves.
 */

// ⚪ Root Node: central major node (triangular ship silhouette)
function getRootNodeIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Base circle backdrop (neutral but prominent)
  drawIconBase(ctx, '#cccccc', (ctx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  }, 'fill', true);

  // Triangular ship silhouette
  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);          // nose
  ctx.lineTo(cx + 5, cy + 5);      // right wing
  ctx.lineTo(cx - 5, cy + 5);      // left wing
  ctx.closePath();
  ctx.fill();

  // Cockpit highlight
  ctx.fillStyle = '#88d4ff';
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 2, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// 🔴 Damage (red): pointed wedge/arrowhead
function getDamageIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#ff4545', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 7, cy + 6);
    ctx.lineTo(cx - 7, cy + 6);
    ctx.closePath();
  });

  // inner cut to read cleaner
  ctx.fillStyle = '#00000055';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 2);
  ctx.lineTo(cx + 4, cy + 4);
  ctx.lineTo(cx - 4, cy + 4);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

// 🔵 Armor (blue): shield silhouette
function getArmorIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#3aa0ff', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 6, cy - 2);
    ctx.lineTo(cx + 5, cy + 4);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 5, cy + 4);
    ctx.lineTo(cx - 6, cy - 2);
    ctx.closePath();
  });

  // crest line
  ctx.strokeStyle = '#0b2b66';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5);
  ctx.lineTo(cx, cy + 6);
  ctx.stroke();

  return canvas;
}

// 🟠 Thrust (orange): triple chevrons
function getThrustIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#ff9933', (ctx) => {
    const drawChevron = (y: number) => {
      ctx.beginPath();
      ctx.moveTo(cx - 6, y);
      ctx.lineTo(cx, y - 4);
      ctx.lineTo(cx + 6, y);
      ctx.lineTo(cx, y + 4);
      ctx.closePath();
      ctx.fill();
    };
    drawChevron(cy - 5);
    drawChevron(cy);
    drawChevron(cy + 5);
  }, 'fill', true);

  return canvas;
}

// 🟣 Block Drop Rate (purple): stacked squares “falling”
function getBlockDropRateIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#a066ff', (ctx) => {
    const rect = (x: number, y: number, s: number) => {
      ctx.beginPath();
      ctx.rect(x, y, s, s);
      ctx.fill();
    };
    rect(5, 6, 6);   // top “block”
    rect(10, 11, 6); // mid “block” (offset)
    rect(13, 16, 6); // bottom “block”
  });

  // motion accents
  ctx.strokeStyle = '#3b1a75';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(9, 9); ctx.lineTo(9, 7);
  ctx.moveTo(14, 14); ctx.lineTo(14, 12);
  ctx.moveTo(17, 19); ctx.lineTo(17, 17);
  ctx.stroke();

  return canvas;
}

// 🟢 Harvest (green): circle with inward arrows
function getHarvestIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#2ecc71', (ctx) => {
    // outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#155e34';
    ctx.lineWidth = 2;
    ctx.stroke();

    // inward arrows (N/E/S/W)
    const arrow = (dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * 9, cy + dy * 9);
      ctx.lineTo(cx + dx * 3, cy + dy * 3);
      // wings
      ctx.lineTo(cx + dx * 5 + dy * 2, cy + dy * 5 - dx * 2);
      ctx.moveTo(cx + dx * 3, cy + dy * 3);
      ctx.lineTo(cx + dx * 5 - dy * 2, cy + dy * 5 + dx * 2);
      ctx.stroke();
    };
    ctx.strokeStyle = '#155e34';
    ctx.lineWidth = 2;
    arrow(0, -1);
    arrow(1, 0);
    arrow(0, 1);
    arrow(-1, 0);
  }, 'stroke', false);

  return canvas;
}

// 🟣 Ability (light powder purple): spark/star glyph
function getAbilityIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#cdb9ff', (ctx) => {
    ctx.beginPath();
    // 8-point star
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const r1 = 8, r2 = 3;
      const x1 = cx + Math.cos(a) * r1;
      const y1 = cy + Math.sin(a) * r1;
      const x2 = cx + Math.cos(a + Math.PI / 8) * r2;
      const y2 = cy + Math.sin(a + Math.PI / 8) * r2;
      if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
  }, 'fill', true);

  // core dot
  ctx.fillStyle = '#7e68c9';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// 🟡 Capitalist (gold): stacked coins with spark
function getCapitalistIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const gold = '#f6c945';
  const shadow = '#8a6b00';
  const highlight = '#fff3b0';

  drawIconBase(ctx, gold, (ctx) => {
    // three coin stacks (simple ovals + bodies)
    const drawCoin = (x: number, y: number, w: number, h: number, bodyH: number) => {
      // body
      ctx.fillStyle = gold;
      ctx.fillRect(x - w / 2, y, w, bodyH);
      // top ellipse
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // bottom rim shadow
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(x, y + bodyH, w / 2, h / 2, 0, 0, Math.PI);
      ctx.fill();
      // highlight
      ctx.strokeStyle = highlight;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x - w * 0.12, y - 0.5, w * 0.22, h * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
    };

    drawCoin(8, 10, 8, 5, 6);
    drawCoin(12, 7, 9, 5, 9);
    drawCoin(16, 12, 7, 4, 4);
  }, 'fill', true);

  // tiny sparkle (profit vibes)
  ctx.strokeStyle = '#fff9d6';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(18.5, 5.0); ctx.lineTo(18.5, 8.0);
  ctx.moveTo(17.0, 6.5); ctx.lineTo(20.0, 6.5);
  ctx.stroke();

  return canvas;
}

// 🟣 Ability Cooldown (powder-purple): hourglass + circular timer ring
function getAbilityCooldownIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // soft fill base (same family as icon-ability)
  drawIconBase(ctx, '#cdb9ff', (ctx) => {
    // outer cooldown ring
    ctx.strokeStyle = '#7e68c9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, -Math.PI / 2, Math.PI * 1.2); // partial arc to suggest progress
    ctx.stroke();

    // hourglass silhouette
    ctx.strokeStyle = '#58489c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 4.5, cy - 6);
    ctx.lineTo(cx + 4.5, cy - 6);
    ctx.lineTo(cx - 2.5, cy - 1.5);
    ctx.lineTo(cx + 2.5, cy + 1.5);
    ctx.lineTo(cx - 4.5, cy + 6);
    ctx.lineTo(cx + 4.5, cy + 6);
    ctx.stroke();

    // sand: top small triangle + bottom pile
    ctx.fillStyle = '#7e68c9';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 2.5);
    ctx.lineTo(cx + 1.8, cy - 4); // tiny top sand
    ctx.lineTo(cx - 1.8, cy - 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - 2.5, cy + 3.5);
    ctx.lineTo(cx + 2.5, cy + 3.5);
    ctx.lineTo(cx, cy + 1.5);
    ctx.closePath();
    ctx.fill();
  }, 'fill', true);

  return canvas;
}

// 🔴 Fire Rate (red family): rotary “speed” dial with triple ticks
function getFireRateIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#ff5a5a', (ctx) => {
    // dial ring
    ctx.strokeStyle = '#7a0e0e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0.25 * Math.PI, 1.65 * Math.PI);
    ctx.stroke();

    // three short tick marks increasing (implies cadence)
    const ticks = [ -30, -10, 10 ].map(a => (a * Math.PI) / 180);
    ctx.strokeStyle = '#2b0000';
    ctx.lineWidth = 2;
    for (const a of ticks) {
      const r1 = 5.0, r2 = 7.5;
      const x1 = cx + Math.cos(a) * r1;
      const y1 = cy + Math.sin(a) * r1;
      const x2 = cx + Math.cos(a) * r2;
      const y2 = cy + Math.sin(a) * r2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // needle (speed pointer) toward upper-right
    ctx.strokeStyle = '#2b0000';
    ctx.lineWidth = 2;
    const na = (-20 * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(na) * 7.5, cy + Math.sin(na) * 7.5);
    ctx.stroke();

    // small hub
    ctx.fillStyle = '#2b0000';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }, 'fill', true);

  return canvas;
}

// 🔵 Armor Mitigation (blue): shield with deflection chevron + hatch
function getArmorMitigationIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#3aa0ff', (ctx) => {
    // shield base (same silhouette family as icon-armor)
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 6, cy - 2);
    ctx.lineTo(cx + 4.5, cy + 4.5);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 4.5, cy + 4.5);
    ctx.lineTo(cx - 6, cy - 2);
    ctx.closePath();
  }, 'fill', true);

  // central mitigation chevron (downward indicates reduction)
  ctx.fillStyle = '#0b2b66';
  ctx.beginPath();
  ctx.moveTo(cx - 3.5, cy - 1);
  ctx.lineTo(cx, cy + 3.5);
  ctx.lineTo(cx + 3.5, cy - 1);
  ctx.lineTo(cx, cy + 1.5);
  ctx.closePath();
  ctx.fill();

  // incoming attack deflected (↘ then deflect)
  ctx.strokeStyle = '#0b2b66';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 6.5, cy - 4.5); // incoming
  ctx.lineTo(cx - 1.5, cy - 1.5);
  ctx.moveTo(cx - 1.5, cy - 1.5); // deflection
  ctx.lineTo(cx + 1.5, cy - 5.5);
  ctx.stroke();

  // subtle hatch lines to suggest "damage shaved off"
  ctx.strokeStyle = '#155a9c';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 5 + i * 2, cy + 1 + i * 0.5);
    ctx.lineTo(cx - 1 + i * 2, cy + 5 + i * 0.5);
    ctx.stroke();
  }

  return canvas;
}

// === Hybrid Glyph Helper (VIVID) ===
// Interlocking rings with rim light, subtle shadow, brighter diamond, and extra sparkles.
// Legible at 24x24; high-contrast without gradients or allocations.
function drawHybridGlyphVivid(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  strokeDark: string,   // ring stroke (dark)
  highlight: string,    // diamond/sparkle light
  shadow: string        // subtle shadow (rgba or hex with alpha)
) {
  // --- drop shadow pass (soft)
  ctx.strokeStyle = shadow; // e.g., rgba(0,0,0,0.35)
  ctx.lineWidth = 3;        // slightly thicker than main stroke
  const r = 4.5;
  ctx.beginPath(); ctx.arc(cx - 3, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + 3, cy, r, 0, Math.PI * 2); ctx.stroke();

  // --- main rings
  ctx.strokeStyle = strokeDark;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx - 3, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + 3, cy, r, 0, Math.PI * 2); ctx.stroke();

  // --- rim light (top-right bias)
  ctx.strokeStyle = highlight;
  ctx.lineWidth = 1.6;
  // partial arcs to look like specular glints
  const arc = (ox: number, start: number, end: number) => {
    ctx.beginPath();
    ctx.arc(cx + ox, cy, r, start, end);
    ctx.stroke();
  };
  const s = -0.35 * Math.PI, e = 0.15 * Math.PI; // small arc segment
  arc(-3, s, e);
  arc(+3, s, e);

  // --- overlap accent (bigger diamond + stroke)
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 2.1);
  ctx.lineTo(cx + 2.1, cy);
  ctx.lineTo(cx, cy + 2.1);
  ctx.lineTo(cx - 2.1, cy);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = strokeDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 2.1);
  ctx.lineTo(cx + 2.1, cy);
  ctx.lineTo(cx, cy + 2.1);
  ctx.lineTo(cx - 2.1, cy);
  ctx.closePath();
  ctx.stroke();

  // --- dual sparkles (bigger, brighter)
  const sparkle = (sx: number, sy: number, len: number) => {
    ctx.strokeStyle = highlight;
    ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(sx, sy - len); ctx.lineTo(sx, sy + len); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - len, sy); ctx.lineTo(sx + len, sy); ctx.stroke();
  };
  sparkle(cx + 7.0, cy - 4.6, 1.7);
  sparkle(cx - 7.2, cy + 4.8, 1.4);
}

// Small base-contrast booster used by all four hybrids.
// Adds a dark inner vignette and a thin outer rim light inside the circular base.
function punchyBaseRings(ctx: CanvasRenderingContext2D, cx: number, cy: number, vignette: string, rim: string) {
  // inner vignette ring
  ctx.strokeStyle = vignette; // e.g., rgba(0,0,0,0.25)
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 8.1, 0, Math.PI * 2); ctx.stroke();

  // outer rim light
  ctx.strokeStyle = rim; // e.g., rgba(255,255,255,0.5)
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, 9.0, 0, Math.PI * 2); ctx.stroke();
}


// 🔴 Damage Hybrid (red family) — vivid
function getDamageHybridIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // hotter red base
  drawIconBase(ctx, '#ff3b3b', () => {}, 'fill', true);
  punchyBaseRings(ctx, cx, cy, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.45)');

  // deeper ring + bright highlight
  drawHybridGlyphVivid(ctx, cx, cy, '#2b0000', '#ffd6d6', 'rgba(0,0,0,0.35)');
  return canvas;
}

// 🔵 Armor Hybrid (blue family) — vivid
function getArmorHybridIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // slightly deeper, saturated blue
  drawIconBase(ctx, '#1f8fff', () => {}, 'fill', true);
  punchyBaseRings(ctx, cx, cy, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.45)');

  drawHybridGlyphVivid(ctx, cx, cy, '#082750', '#e8f4ff', 'rgba(0,0,0,0.35)');
  return canvas;
}

// 🟠 Thrust Hybrid (orange family) — vivid
function getThrustHybridIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // brighter orange without drifting into yellow
  drawIconBase(ctx, '#ff8a1f', () => {}, 'fill', true);
  punchyBaseRings(ctx, cx, cy, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.45)');

  drawHybridGlyphVivid(ctx, cx, cy, '#5a2600', '#ffe7cc', 'rgba(0,0,0,0.35)');
  return canvas;
}

// 🟡 Capitalist Hybrid (gold family) — vivid
function getCapitalistHybridIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // punchier gold (still readable)
  drawIconBase(ctx, '#f6c212', () => {}, 'fill', true);
  punchyBaseRings(ctx, cx, cy, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.45)');

  drawHybridGlyphVivid(ctx, cx, cy, '#6b5200', '#fff7cf', 'rgba(0,0,0,0.35)');
  return canvas;
}

// 🟠 Turn Power (orange family): dual curvature arrows (quick yaw)
function getTurnPowerIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#ff9933', () => {}, 'fill', true);

  ctx.strokeStyle = '#7a3c00';
  ctx.lineWidth = 2;

  // left-turn arc + arrowhead
  ctx.beginPath();
  ctx.arc(cx, cy, 6.5, (200 * Math.PI) / 180, (340 * Math.PI) / 180);
  ctx.stroke();
  ctx.beginPath(); // arrowhead
  ctx.moveTo(cx - 7.5, cy + 1.5);
  ctx.lineTo(cx - 2.5, cy + 3.5);
  ctx.lineTo(cx - 4.5, cy - 1.0);
  ctx.closePath();
  ctx.fillStyle = '#7a3c00';
  ctx.fill();

  // right-turn arc + arrowhead
  ctx.beginPath();
  ctx.arc(cx, cy, 6.5, (20 * Math.PI) / 180, (160 * Math.PI) / 180);
  ctx.stroke();
  ctx.beginPath(); // arrowhead
  ctx.moveTo(cx + 7.5, cy - 1.5);
  ctx.lineTo(cx + 2.5, cy - 3.5);
  ctx.lineTo(cx + 4.5, cy + 1.0);
  ctx.closePath();
  ctx.fill();

  // central hub dot (steering feel)
  ctx.fillStyle = '#7a3c00';
  ctx.beginPath();
  ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// 🔴 Slayer (bright red): sword over burst
function getSlayerIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#c426c6ff', () => {}, 'fill', true);

  // radial burst ticks
  ctx.strokeStyle = '#ff930fff';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const r1 = 7.5, r2 = 9.0;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }

  // sword silhouette
  ctx.fillStyle = '#b005b6ff';
  // blade
  ctx.beginPath();
  ctx.moveTo(cx - 1, cy - 7);
  ctx.lineTo(cx + 1, cy - 7);
  ctx.lineTo(cx + 0.8, cy + 4);
  ctx.lineTo(cx - 0.8, cy + 4);
  ctx.closePath();
  ctx.fill();
  // tip triangle
  ctx.beginPath();
  ctx.moveTo(cx - 1.1, cy - 7);
  ctx.lineTo(cx + 1.1, cy - 7);
  ctx.lineTo(cx, cy - 9.5);
  ctx.closePath();
  ctx.fill();
  // crossguard
  ctx.fillRect(cx - 4, cy + 3.5, 8, 1.8);
  // pommel
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 1.4, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// 🔵 Atronach (blue/defensive): faceted crystal on shield
function getAtronachIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#3aa0ff', (ctx) => {
    // shield base (same family as armor)
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 6, cy - 2);
    ctx.lineTo(cx + 4.5, cy + 4.8);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 4.5, cy + 4.8);
    ctx.lineTo(cx - 6, cy - 2);
    ctx.closePath();
  }, 'fill', true);

  // faceted crystal (hexagon + cross facets)
  ctx.strokeStyle = '#0b2b66';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const r = 3.8;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // facet lines
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
  ctx.stroke();

  return canvas;
}

// 🔴 Voidwalker (red/corrupted mist): wisp curls + void eye
function getVoidwalkerIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // darker crimson base to differentiate from damage/slayer
  drawIconBase(ctx, '#c21e3a', () => {}, 'fill', true);

  // misty curls (beziers)
  ctx.strokeStyle = '#3a0008';
  ctx.lineWidth = 2;
  const curl = (ox: number, oy: number, sx: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - 6 + ox, cy + oy);
    ctx.bezierCurveTo(cx - 1 + ox, cy - 4 + oy, cx + 3 + ox, cy + 4 + oy, cx + 6 * sx + ox, cy - 1 + oy);
    ctx.stroke();
  };
  curl(-1, -2, 0.9);
  curl(0, 2, 0.7);
  curl(1, 0, 1.0);

  // central "void eye"
  ctx.fillStyle = '#130003';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 3.4, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffb3c1';
  ctx.beginPath();
  ctx.ellipse(cx + 0.6, cy - 0.2, 1.2, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // stray motes
  ctx.fillStyle = '#3a0008';
  for (const [dx, dy] of [[-6, -6], [6, -5], [-5, 6], [5, 5]]) {
    ctx.beginPath();
    ctx.arc(cx + dx * 0.6, cy + dy * 0.6, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

// 🟣 Incident Investigator (purple): magnifying glass over node lattice
function getIncidentInvestigatorIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#a066ff', () => {}, 'fill', true);

  // tiny node lattice (3 dots + lines)
  ctx.strokeStyle = '#3b1a75';
  ctx.fillStyle = '#3b1a75';
  ctx.lineWidth = 1.5;

  const n1 = { x: cx - 5, y: cy - 2 };
  const n2 = { x: cx - 1, y: cy - 6 };
  const n3 = { x: cx + 2, y: cy - 1 };
  ctx.beginPath();
  ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y);
  ctx.lineTo(n3.x, n3.y);
  ctx.lineTo(n1.x, n1.y);
  ctx.stroke();
  for (const n of [n1, n2, n3]) {
    ctx.beginPath(); ctx.arc(n.x, n.y, 1.4, 0, Math.PI * 2); ctx.fill();
  }

  // magnifying glass (circle + handle), slightly angled
  ctx.strokeStyle = '#e0d1ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx + 4.5, cy + 2.5, 4.2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath(); // handle
  ctx.moveTo(cx + 7.5, cy + 5.5);
  ctx.lineTo(cx + 10.5, cy + 8.5);
  ctx.stroke();

  // subtle glass highlight
  ctx.strokeStyle = '#fff3ff';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx + 4.5, cy + 2.5, 3.2, -0.9, -0.1);
  ctx.stroke();

  return canvas;
}

// 🟣 Builder (purple): stacked blocks + tiny wrench
function getBuilderIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#a066ff', () => {}, 'fill', true);

  // three blocks (staggered)
  ctx.fillStyle = '#3b1a75';
  const b = (x: number, y: number) => { ctx.fillRect(x, y, 6, 6); };
  b(5, 11); b(9, 7); b(13, 11);

  // block seams (suggest construction)
  ctx.strokeStyle = '#d9c7ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(5, 14); ctx.lineTo(11, 14);
  ctx.moveTo(9, 10); ctx.lineTo(15, 10);
  ctx.moveTo(13, 14); ctx.lineTo(19, 14);
  ctx.stroke();

  // tiny wrench overlay (simple jaw + handle)
  ctx.strokeStyle = '#e7dbff';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(16, 6);
  ctx.lineTo(12.5, 9.5);
  ctx.stroke();
  ctx.beginPath(); // wrench jaw
  ctx.arc(16, 6, 2.2, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  return canvas;
}

// 🟡 Trademaster (gold): balance scales
function getTrademasterIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const gold = '#f6c945';
  const dark = '#8a6b00';
  const hi = '#fff3b0';

  drawIconBase(ctx, gold, () => {}, 'fill', true);

  // pillar
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 6); ctx.lineTo(12, 16);
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.fillRect(8, 16, 8, 2); // base

  // crossbar
  ctx.beginPath();
  ctx.moveTo(7, 8.5); ctx.lineTo(17, 8.5);
  ctx.stroke();

  // chains + pans
  const pan = (x: number, y: number, w: number) => {
    ctx.strokeStyle = dark; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x, 8.5); ctx.lineTo(x - 2, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, 8.5); ctx.lineTo(x + 2, y); ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(x, y + 1.5, w / 2, 2, 0, 0, Math.PI);
    ctx.fill();
  };
  pan(8.5, 13, 6.5);
  pan(15.5, 12, 6.5);

  // highlight glint
  ctx.strokeStyle = hi; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(12, 6.8, 2.5, -0.8, -0.1); ctx.stroke();

  return canvas;
}

// 🟠 Explorer (orange): summit flag + dotted trail
function getExplorerIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const base = '#ff9933';
  const dark = '#7a3c00';

  drawIconBase(ctx, base, () => {}, 'fill', true);

  // trail (dotted)
  ctx.fillStyle = dark;
  const dots: [number, number][] = [[5,16],[7,14],[9,13],[11,12],[13,11]];
  for (const [x,y] of dots) { ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI*2); ctx.fill(); }

  // hill
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(7, 17);
  ctx.lineTo(13, 12);
  ctx.lineTo(19, 17);
  ctx.closePath();
  ctx.fill();

  // flagpole
  ctx.strokeStyle = '#2b1500';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(13, 12);
  ctx.lineTo(13, 6.5);
  ctx.stroke();

  // flag (bright)
  ctx.fillStyle = '#ffd19a';
  ctx.beginPath();
  ctx.moveTo(13, 7);
  ctx.lineTo(18, 8.5);
  ctx.lineTo(13, 10);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

// 🟤 Boss Mastery (brown): ominous mask with eyes
function getBossMasteryIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const base = '#8b5e34';
  const dark = '#3a260f';
  const glow = '#ffd9b3';

  drawIconBase(ctx, base, () => {}, 'fill', true);

  // mask shape (rounded rectangle)
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(6, 7);
  ctx.lineTo(18, 7);
  ctx.quadraticCurveTo(20, 12, 18, 17);
  ctx.lineTo(6, 17);
  ctx.quadraticCurveTo(4, 12, 6, 7);
  ctx.closePath();
  ctx.fill();

  // evil eyes
  ctx.fillStyle = glow;
  const eye = (cx: number, cy: number, flip = 1) => {
    ctx.beginPath();
    ctx.moveTo(cx - 3*flip, cy);
    ctx.quadraticCurveTo(cx, cy - 2.3, cx + 3*flip, cy);
    ctx.quadraticCurveTo(cx, cy + 1.8, cx - 3*flip, cy);
    ctx.closePath();
    ctx.fill();
  };
  eye(9, 12, 1);
  eye(15, 12, -1);

  // brow ridge
  ctx.strokeStyle = '#1c1208';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(7.5, 10);
  ctx.quadraticCurveTo(12, 8.2, 16.5, 10);
  ctx.stroke();

  // subtle fangs
  ctx.fillStyle = '#d6b391';
  ctx.fillRect(10.3, 15.2, 1.2, 1.8);
  ctx.fillRect(12.5, 15.2, 1.2, 1.8);

  return canvas;
}

// 🔴 Slayer Minor — just a sword silhouette, lighter red
function getSlayerMinorIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#d3158dff', () => {}, 'fill', true);

  ctx.fillStyle = '#a716cfff';
  ctx.beginPath();
  ctx.moveTo(12 - 1, 7);
  ctx.lineTo(12 + 1, 7);
  ctx.lineTo(12 + 0.8, 15);
  ctx.lineTo(12 - 0.8, 15);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(10, 15, 4, 1.5); // crossguard
  ctx.beginPath();
  ctx.arc(12, 17, 1.2, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// 🔵 Atronach Minor — simple blue shield only
function getAtronachMinorIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#66b8ff', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(12, 5);
    ctx.lineTo(17, 10);
    ctx.lineTo(15, 16);
    ctx.lineTo(12, 19);
    ctx.lineTo(9, 16);
    ctx.lineTo(7, 10);
    ctx.closePath();
  }, 'fill', true);
  return canvas;
}

// 🔴 Voidwalker Minor — single swirl, no eye
function getVoidwalkerMinorIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#d34c62', () => {}, 'fill', true);

  ctx.strokeStyle = '#3a0008';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(12, 12, 5.5, 0.3, Math.PI * 1.8);
  ctx.stroke();

  return canvas;
}

// 🟣 Incident Investigator Minor — plain magnifier only
function getIncidentInvestigatorMinorIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#b488ff', () => {}, 'fill', true);

  ctx.strokeStyle = '#e0d1ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(12, 11, 4.0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14.5, 13.5);
  ctx.lineTo(17, 16);
  ctx.stroke();

  return canvas;
}

// 🟣 Builder Minor — single purple block
function getBuilderMinorIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#b488ff', () => {}, 'fill', true);

  ctx.fillStyle = '#3b1a75';
  ctx.fillRect(9, 9, 6, 6);

  return canvas;
}

// 🟡 Trademaster Minor — single gold coin
function getTrademasterMinorIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const gold = '#ffdb6b';
  drawIconBase(ctx, gold, () => {}, 'fill', true);

  ctx.fillStyle = '#8a6b00';
  ctx.beginPath();
  ctx.ellipse(12, 12, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// 🟠 Explorer Minor — small flag only
function getExplorerMinorIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#ffb266', () => {}, 'fill', true);

  ctx.strokeStyle = '#2b1500';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(11, 15);
  ctx.lineTo(11, 8);
  ctx.stroke();

  ctx.fillStyle = '#ffd19a';
  ctx.beginPath();
  ctx.moveTo(11, 8);
  ctx.lineTo(15, 9.5);
  ctx.lineTo(11, 11);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

// 🟤 Boss Mastery Minor — plain mask outline
function getBossMasteryMinorIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  drawIconBase(ctx, '#b17c50', () => {}, 'fill', true);

  ctx.strokeStyle = '#3a260f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(7, 8);
  ctx.lineTo(17, 8);
  ctx.quadraticCurveTo(19, 12, 17, 16);
  ctx.lineTo(7, 16);
  ctx.quadraticCurveTo(5, 12, 7, 8);
  ctx.stroke();

  return canvas;
}

// 🟢 Mithradite (poison resistance): shield + droplet with strike
function getMithraditeIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // toxic green base tile (distinct from harvest)
  drawIconBase(ctx, '#78d65f', () => {}, 'fill', true);

  // shield silhouette (same family language as armor)
  ctx.fillStyle = '#1e5f23';   // dark green
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx + 6, cy - 2);
  ctx.lineTo(cx + 4.7, cy + 4.8);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx - 4.7, cy + 4.8);
  ctx.lineTo(cx - 6, cy - 2);
  ctx.closePath();
  ctx.fill();

  // inner droplet (poison motif), lighter fill for read
  ctx.fillStyle = '#b8f3c0';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 2.5);            // tip
  ctx.bezierCurveTo(cx + 2.4, cy - 0.6, cx + 2.6, cy + 2.1, cx, cy + 3.6);
  ctx.bezierCurveTo(cx - 2.6, cy + 2.1, cx - 2.4, cy - 0.6, cx, cy - 2.5);
  ctx.closePath();
  ctx.fill();

  // subtle “toxic bubbles” accents
  ctx.fillStyle = '#1e5f23';
  const bubble = (x: number, y: number, r: number) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };
  bubble(cx - 2.8, cy + 1.2, 0.7);
  bubble(cx + 2.6, cy + 0.4, 0.6);

  // strike (resistance cue) — high-contrast diagonal slash
  ctx.strokeStyle = '#f0fff2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 6.5, cy + 6);
  ctx.lineTo(cx + 6.5, cy - 6);
  ctx.stroke();

  // tiny trim to push legibility
  ctx.strokeStyle = '#103a14';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 5.8, cy + 5.3);
  ctx.lineTo(cx + 5.8, cy - 5.3);
  ctx.stroke();

  return canvas;
}

// 🧊 Acclimatization (cold resistance): shield + snowflake with strike
function getAcclimatizationIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // icy base (distinct from standard armor blue)
  drawIconBase(ctx, '#8de1ff', () => {}, 'fill', true);

  // shield silhouette (defense semantics; same family as armor)
  ctx.fillStyle = '#0b2b66'; // deep navy
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx + 6, cy - 2);
  ctx.lineTo(cx + 4.7, cy + 4.8);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx - 4.7, cy + 4.8);
  ctx.lineTo(cx - 6, cy - 2);
  ctx.closePath();
  ctx.fill();

  // hex snowflake (legible at 24px)
  ctx.strokeStyle = '#e7f7ff';
  ctx.lineWidth = 1.6;

  // main axes (6 directions every 60°)
  const arms: number[] = [0, 60, 120, 180, 240, 300];
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arm = (deg: number, r1: number, r2: number) => {
    const a = toRad(deg);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  };
  arms.forEach(d => arm(d, 0.8, 4.8));

  // small barbs on 0°, 120°, 240° arms for readability
  ctx.lineWidth = 1.4;
  const barb = (deg: number, offset: number, spreadDeg: number) => {
    const a = toRad(deg);
    const p = { x: cx + Math.cos(a) * offset, y: cy + Math.sin(a) * offset };
    const s1 = toRad(deg + spreadDeg);
    const s2 = toRad(deg - spreadDeg);
    const r = 2.1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(s1) * r, p.y + Math.sin(s1) * r);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(s2) * r, p.y + Math.sin(s2) * r);
    ctx.stroke();
  };
  [0, 120, 240].forEach(d => barb(d, 3.2, 28));

  // central hub
  ctx.fillStyle = '#cfeefe';
  ctx.beginPath();
  ctx.arc(cx, cy, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // resistance strike (diagonal slash)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 6.5, cy + 6.2);
  ctx.lineTo(cx + 6.5, cy - 6.2);
  ctx.stroke();

  // subtle trim for contrast
  ctx.strokeStyle = '#073056';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 5.9, cy + 5.6);
  ctx.lineTo(cx + 5.9, cy - 5.6);
  ctx.stroke();

  return canvas;
}

// 🔆 Thermal Insulation (heat resistance): shield + sunburst with strike
function getThermalInsulationIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // warm amber base tile (distinct from thrust orange)
  drawIconBase(ctx, '#ffc47a', () => {}, 'fill', true);

  // shield silhouette (same language as other resistances)
  ctx.fillStyle = '#7a3c00'; // deep brown-red
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx + 6, cy - 2);
  ctx.lineTo(cx + 4.7, cy + 4.8);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx - 4.7, cy + 4.8);
  ctx.lineTo(cx - 6, cy - 2);
  ctx.closePath();
  ctx.fill();

  // central sunburst (8 rays + core)
  ctx.strokeStyle = '#ffe8bb';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    const r1 = 1.6, r2 = 4.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  // sun core
  ctx.fillStyle = '#ffe8bb';
  ctx.beginPath();
  ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // resistance strike (diagonal slash)
  ctx.strokeStyle = '#fff9f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 6.5, cy + 6.2);
  ctx.lineTo(cx + 6.5, cy - 6.2);
  ctx.stroke();

  // subtle shadow trim for contrast
  ctx.strokeStyle = '#4a1f00';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 5.9, cy + 5.6);
  ctx.lineTo(cx + 5.9, cy - 5.6);
  ctx.stroke();

  return canvas;
}

// ❄️🔥 Elemental Ward Hybrid (cold+fire resistance) — strictly circular masked
function getElementalWardHybridIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;
  const R = 9; // matches your icon language (e.g., root node)

  // --- Circular mask (no base fill) ---
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Split background fully constrained by the clip
  ctx.fillStyle = '#8de1ff'; // cold left
  ctx.fillRect(0, 0, cx, 24);
  ctx.fillStyle = '#ffc47a'; // heat right
  ctx.fillRect(cx, 0, 24 - cx, 24);

  ctx.restore();

  // --- Foreground glyphs ---
  // Neutral shield (reads on both halves)
  ctx.fillStyle = '#233047'; // deep slate
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx + 6, cy - 2);
  ctx.lineTo(cx + 4.7, cy + 4.8);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx - 4.7, cy + 4.8);
  ctx.lineTo(cx - 6, cy - 2);
  ctx.closePath();
  ctx.fill();

  // Snowflake (compact hex)
  ctx.strokeStyle = '#e7f7ff';
  ctx.lineWidth = 1.5;
  const arm = (deg: number, r1: number, r2: number) => {
    const a = (deg * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  };
  [0, 60, 120, 180, 240, 300].forEach(d => arm(d, 0.8, 4.2));
  ctx.fillStyle = '#cfeefe';
  ctx.beginPath();
  ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Sunburst
  ctx.strokeStyle = '#ffe8bb';
  ctx.lineWidth = 1.7;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    const r1 = 1.4, r2 = 4.0;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffe8bb';
  ctx.beginPath();
  ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Resistance slash
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 6.5, cy + 6.2);
  ctx.lineTo(cx + 6.5, cy - 6.2);
  ctx.stroke();

  // Contrast trim
  ctx.strokeStyle = '#182131';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 5.9, cy + 5.6);
  ctx.lineTo(cx + 5.9, cy - 5.6);
  ctx.stroke();

  return canvas;
}

// 🟣 Power Surge (increased rare powerup chance): burst + cube + sparkles
function getPowerSurgeIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Rich violet base tile
  drawIconBase(ctx, '#c266ff', () => {}, 'fill', true);

  // Radiant burst ring (implies rarity)
  ctx.strokeStyle = '#3b0f66';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.stroke();

  // Secondary inner burst ring
  ctx.strokeStyle = '#e6b3ff';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.stroke();

  // Central cube (powerup shape)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 3);
  ctx.lineTo(cx + 3, cy - 3);
  ctx.lineTo(cx + 3, cy + 3);
  ctx.lineTo(cx - 3, cy + 3);
  ctx.closePath();
  ctx.fill();

  // Cube face shading
  ctx.fillStyle = '#ffe6ff';
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 3);
  ctx.lineTo(cx + 3, cy - 3);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();

  // Sparkles — suggest rarity
  ctx.strokeStyle = '#fff7ff';
  ctx.lineWidth = 1.5;
  const sparkle = (sx: number, sy: number, r: number) => {
    ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy + r);
    ctx.moveTo(sx - r, sy); ctx.lineTo(sx + r, sy);
    ctx.stroke();
  };
  sparkle(cx - 6, cy - 4, 1.3);
  sparkle(cx + 5, cy + 3, 1.1);

  return canvas;
}

// 🟣💛 Epic Infusion (increased chance of epic powerups): burst + gold cube + sparkles
function getEpicInfusionIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Deep royal purple base tile
  drawIconBase(ctx, '#7b2cff', () => {}, 'fill', true);

  // Outer radiant burst ring
  ctx.strokeStyle = '#3b0f66';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.stroke();

  // Inner radiant burst ring (golden accent)
  ctx.strokeStyle = '#ffd966';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
  ctx.stroke();

  // Central cube (epic powerup) — gold body
  const gold = '#ffd966';
  const goldLight = '#fff6cc';
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 3);
  ctx.lineTo(cx + 3, cy - 3);
  ctx.lineTo(cx + 3, cy + 3);
  ctx.lineTo(cx - 3, cy + 3);
  ctx.closePath();
  ctx.fill();

  // Light face shading
  ctx.fillStyle = goldLight;
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 3);
  ctx.lineTo(cx + 3, cy - 3);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();

  // Larger sparkles for epic feel
  ctx.strokeStyle = '#fffbe6';
  ctx.lineWidth = 1.7;
  const sparkle = (sx: number, sy: number, r: number) => {
    ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy + r);
    ctx.moveTo(sx - r, sy); ctx.lineTo(sx + r, sy);
    ctx.stroke();
  };
  sparkle(cx - 6, cy - 4, 1.6);
  sparkle(cx + 5, cy + 3, 1.4);

  return canvas;
}

// ❤️‍🩹 Repair Bounty (increased repair-orb drop chance): glossy orb + cross + drop trail
function getRepairBountyIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Vibrant rose base (distinct from Damage red)
  drawIconBase(ctx, '#ff6a82', () => {}, 'fill', true);

  // --- helper: glossy orb with optional cross
  const drawOrb = (
    x: number, y: number, r: number,
    body = '#d81f3a',    // deep red
    rim  = '#5a0010',    // dark rim
    gleam= '#ffd6df',    // highlight
    withCross = false
  ) => {
    // body
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // rim (gives depth)
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(1, r * 0.35);
    ctx.beginPath();
    ctx.arc(x, y, r - 0.2, 0, Math.PI * 2);
    ctx.stroke();

    // glossy highlight
    ctx.fillStyle = gleam;
    ctx.beginPath();
    ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.45, r * 0.28, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // medical cross (for primary orb)
    if (withCross) {
      ctx.fillStyle = '#ffffff';
      const w = Math.max(1.5, r * 0.9);
      const t = Math.max(1.1, r * 0.45);
      // vertical bar
      ctx.fillRect(x - t / 2, y - w / 2, t, w);
      // horizontal bar
      ctx.fillRect(x - w / 2, y - t / 2, w, t);
      // subtle inner shadow to keep legibility on light UIs
      ctx.strokeStyle = '#8e0016';
      ctx.lineWidth = 0.9;
      ctx.strokeRect(x - w / 2, y - t / 2, w, t);
      ctx.strokeRect(x - t / 2, y - w / 2, t, w);
    }
  };

  // Secondary orbs (suggest "more of them")
  drawOrb(cx - 6.5, cy + 2.5, 2.4, '#d81f3a', '#5a0010', '#ffd6df', false);
  drawOrb(cx + 6.2, cy + 1.0, 2.0, '#d81f3a', '#5a0010', '#ffd6df', false);

  // Primary orb (center) with cross
  drawOrb(cx, cy - 1, 4.1, '#e31f3f', '#5a0010', '#ffe3ea', true);

  // Dotted drop trail under primary orb → communicates "increased drop rate"
  ctx.fillStyle = '#5a0010';
  const dots: [number, number, number][] = [
    [cx, cy + 4.8, 0.9],
    [cx, cy + 7.4, 0.8],
    [cx, cy + 9.5, 0.7],
  ];
  for (const [dx, dy, r] of dots) {
    ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill();
  }

  // Sparkles for “bounty” vibe
  ctx.strokeStyle = '#fff0f4';
  ctx.lineWidth = 1.6;
  const sparkle = (sx: number, sy: number, s: number) => {
    ctx.beginPath(); ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy); ctx.stroke();
  };
  sparkle(cx - 8, cy - 3.5, 1.4);
  sparkle(cx + 7.5, cy - 5.0, 1.2);

  return canvas;
}

// ❤️‍🔥 Repair Amplification (increased repair-orb effectiveness): amplified orb + radiating rings
function getRepairAmplificationIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Deep vibrant red base (different from Repair Bounty's pinker tone)
  drawIconBase(ctx, '#ff3b4d', () => {}, 'fill', true);

  // Radiating healing rings (amplification effect)
  ctx.strokeStyle = '#ffd6df';
  ctx.lineWidth = 1.6;
  const radii = [6.5, 8.0];
  for (const r of radii) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Main amplified repair orb
  const orbRadius = 4.4;
  ctx.fillStyle = '#e31f3f'; // body
  ctx.beginPath();
  ctx.arc(cx, cy, orbRadius, 0, Math.PI * 2);
  ctx.fill();

  // Orb rim for depth
  ctx.strokeStyle = '#5a0010';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(cx, cy, orbRadius - 0.2, 0, Math.PI * 2);
  ctx.stroke();

  // Glossy highlight
  ctx.fillStyle = '#ffe3ea';
  ctx.beginPath();
  ctx.ellipse(cx - orbRadius * 0.35, cy - orbRadius * 0.35, orbRadius * 0.45, orbRadius * 0.28, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Bold medical cross to convey "more healing per orb"
  ctx.fillStyle = '#ffffff';
  const w = 3.0, t = 1.2;
  ctx.fillRect(cx - t / 2, cy - w / 2, t, w);
  ctx.fillRect(cx - w / 2, cy - t / 2, w, t);

  // Cross inner shadow for clarity
  ctx.strokeStyle = '#8e0016';
  ctx.lineWidth = 0.9;
  ctx.strokeRect(cx - w / 2, cy - t / 2, w, t);
  ctx.strokeRect(cx - t / 2, cy - w / 2, t, w);

  // Energy pulse sparkles
  ctx.strokeStyle = '#fff0f4';
  ctx.lineWidth = 1.6;
  const sparkle = (sx: number, sy: number, s: number) => {
    ctx.beginPath(); ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy); ctx.stroke();
  };
  sparkle(cx - 7.5, cy - 5.0, 1.4);
  sparkle(cx + 7.0, cy + 4.5, 1.2);

  return canvas;
}

// 🩸 Life Leech Chance (vampirism chance): fangs + small droplet
function getLifeLeechChanceIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Deep vampiric red base
  drawIconBase(ctx, '#b3002d', () => {}, 'fill', true);

  // Stylized white fangs
  ctx.fillStyle = '#ffffff';
  const fang = (x: number) => {
    ctx.beginPath();
    ctx.moveTo(x - 1, cy - 2);
    ctx.lineTo(x + 1, cy - 2);
    ctx.lineTo(x, cy + 4);
    ctx.closePath();
    ctx.fill();
  };
  fang(cx - 3);
  fang(cx + 3);

  // Small blood droplet under right fang
  ctx.fillStyle = '#e31f3f';
  ctx.beginPath();
  ctx.moveTo(cx + 3, cy + 5);
  ctx.quadraticCurveTo(cx + 4.5, cy + 7, cx + 3, cy + 9);
  ctx.quadraticCurveTo(cx + 1.5, cy + 7, cx + 3, cy + 5);
  ctx.closePath();
  ctx.fill();

  // Gloss on droplet
  ctx.fillStyle = '#ffd6df';
  ctx.beginPath();
  ctx.ellipse(cx + 2.6, cy + 6.3, 0.6, 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// 🩸 Life Leech Amount (vampirism potency): fangs + large droplet + radiance (centered)
function getLifeLeechAmountIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Bright vampiric red base
  drawIconBase(ctx, '#cc0033', () => {}, 'fill', true);

  // Droplet center point (slightly above true center for better balance)
  const dropCenterY = cy + 1;

  // Radiating rings (centered on droplet, not canvas)
  ctx.strokeStyle = '#ff99aa';
  ctx.lineWidth = 1.4;
  [6.0, 7.5].forEach(r => {
    ctx.beginPath();
    ctx.arc(cx, dropCenterY, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Stylized fangs (lifted slightly so they don't crowd the droplet)
  ctx.fillStyle = '#ffffff';
  const fangY = cy - 3; // moved up from -2
  const fang = (x: number) => {
    ctx.beginPath();
    ctx.moveTo(x - 1.2, fangY);
    ctx.lineTo(x + 1.2, fangY);
    ctx.lineTo(x, fangY + 6); // tip still overlaps droplet
    ctx.closePath();
    ctx.fill();
  };
  fang(cx - 3);
  fang(cx + 3);

  // Large blood droplet (centered vertically)
  const dropRadiusX = 2.8, dropRadiusY = 6;
  ctx.fillStyle = '#e31f3f';
  ctx.beginPath();
  ctx.moveTo(cx, dropCenterY - 1.5);
  ctx.quadraticCurveTo(cx + dropRadiusX, dropCenterY + 2.5, cx, dropCenterY + 5);
  ctx.quadraticCurveTo(cx - dropRadiusX, dropCenterY + 2.5, cx, dropCenterY - 1.5);
  ctx.closePath();
  ctx.fill();

  // Gloss highlight
  ctx.fillStyle = '#ffd6df';
  ctx.beginPath();
  ctx.ellipse(cx - 0.8, dropCenterY + 0.5, 1.0, 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// 🩸 Vampiric Hybrid (life leech chance + amount): fangs + small & large droplet + radiance + hybrid rings
function getVampiricHybridIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Deep vampiric crimson base
  drawIconBase(ctx, '#cc0033', () => {}, 'fill', true);

  // --- Main vampirism motif ---
  // Fangs
  ctx.fillStyle = '#ffffff';
  const fangY = cy - 3;
  const fang = (x: number) => {
    ctx.beginPath();
    ctx.moveTo(x - 1.2, fangY);
    ctx.lineTo(x + 1.2, fangY);
    ctx.lineTo(x, fangY + 6);
    ctx.closePath();
    ctx.fill();
  };
  fang(cx - 3.2);
  fang(cx + 3.2);

  // Large droplet (amount)
  const largeDropCenterY = cy + 1;
  ctx.fillStyle = '#e31f3f';
  ctx.beginPath();
  ctx.moveTo(cx, largeDropCenterY - 2);
  ctx.quadraticCurveTo(cx + 2.8, largeDropCenterY + 2.5, cx, largeDropCenterY + 5);
  ctx.quadraticCurveTo(cx - 2.8, largeDropCenterY + 2.5, cx, largeDropCenterY - 2);
  ctx.closePath();
  ctx.fill();
  // Gloss
  ctx.fillStyle = '#ffd6df';
  ctx.beginPath();
  ctx.ellipse(cx - 0.8, largeDropCenterY + 0.5, 1.0, 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Radiance
  ctx.strokeStyle = '#ff99aa';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(cx, largeDropCenterY, 5.8, 0, Math.PI * 2);
  ctx.stroke();

  // Small droplet (chance)
  const smallDropY = cy + 6.5;
  ctx.fillStyle = '#e31f3f';
  ctx.beginPath();
  ctx.moveTo(cx + 4, smallDropY - 1);
  ctx.quadraticCurveTo(cx + 5, smallDropY + 1.5, cx + 4, smallDropY + 3);
  ctx.quadraticCurveTo(cx + 3, smallDropY + 1.5, cx + 4, smallDropY - 1);
  ctx.closePath();
  ctx.fill();
  // Gloss
  ctx.fillStyle = '#ffd6df';
  ctx.beginPath();
  ctx.ellipse(cx + 3.8, smallDropY + 0.5, 0.5, 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- Hybrid glyph overlay ---
  drawHybridGlyphVivid(
    ctx, cx, cy,
    '#2b0000',   // dark stroke for rings
    '#ffd6d6',   // bright highlight
    'rgba(0,0,0,0.35)' // subtle shadow
  );

  return canvas;
}

// 🌀 Kinetic Ward (movement-slow resistance): shield + snapping chain + resistance slash
function getKineticWardIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Distinct teal base (separate from harvest green and armor blue)
  drawIconBase(ctx, '#5fe1d6', () => {}, 'fill', true);

  // Shield silhouette (defense semantics; same family as other resistances)
  ctx.fillStyle = '#0b3a3a'; // deep teal-slate
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx + 6, cy - 2);
  ctx.lineTo(cx + 4.7, cy + 4.8);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx - 4.7, cy + 4.8);
  ctx.lineTo(cx - 6, cy - 2);
  ctx.closePath();
  ctx.fill();

  // --- Snapping chain motif (reads as "cannot be restrained/slow")
  // Left link
  ctx.strokeStyle = '#e8fffb';
  ctx.lineWidth = 2;
  const drawLink = (x: number, y: number, w: number, h: number, rot: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    // Outer rounded-rect path
    const rx = w * 0.5, ry = h * 0.5, r = Math.min(rx, ry) * 0.55;
    ctx.moveTo(-rx + r, -ry);
    ctx.lineTo(rx - r, -ry);
    ctx.quadraticCurveTo(rx, -ry, rx, -ry + r);
    ctx.lineTo(rx, ry - r);
    ctx.quadraticCurveTo(rx, ry, rx - r, ry);
    ctx.lineTo(-rx + r, ry);
    ctx.quadraticCurveTo(-rx, ry, -rx, ry - r);
    ctx.lineTo(-rx, -ry + r);
    ctx.quadraticCurveTo(-rx, -ry, -rx + r, -ry);
    ctx.stroke();
    ctx.restore();
  };

  // Two links angled toward the break
  drawLink(cx - 3.8, cy - 1.0, 7.2, 4.0, -0.35); // left link
  drawLink(cx + 4.2, cy + 1.2, 7.2, 4.0, 0.35);  // right link

  // Crack/jagged break at the center
  ctx.strokeStyle = '#b6fffa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 1.8, cy - 0.8);
  ctx.lineTo(cx - 0.6, cy + 0.4);
  ctx.lineTo(cx + 0.6, cy - 0.6);
  ctx.lineTo(cx + 1.8, cy + 0.6);
  ctx.stroke();

  // Tiny shard sparkles to sell the snap
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.4;
  const spark = (sx: number, sy: number, s: number) => {
    ctx.beginPath(); ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy); ctx.stroke();
  };
  spark(cx - 3.5, cy - 3.0, 1.1);
  spark(cx + 3.6, cy + 2.6, 1.0);

  // Resistance diagonal slash (consistent with other resist nodes)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 6.5, cy + 6.2);
  ctx.lineTo(cx + 6.5, cy - 6.2);
  ctx.stroke();

  // Subtle dark trim for contrast on bright UIs
  ctx.strokeStyle = '#073333';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 5.9, cy + 5.6);
  ctx.lineTo(cx + 5.9, cy - 5.6);
  ctx.stroke();

  return canvas;
}

// === Escort Formation Helper (tiny deltas, no allocs)
function drawEscortFormation(ctx: CanvasRenderingContext2D, cx: number, cy: number, fill: string) {
  ctx.fillStyle = fill;

  const tri = (x: number, y: number, s: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - s);      // nose up
    ctx.lineTo(x + s * 0.8, y + s * 0.9);
    ctx.lineTo(x - s * 0.8, y + s * 0.9);
    ctx.closePath();
    ctx.fill();
  };

  // Leader slightly forward; wings staggered
  tri(cx,     cy - 1.5, 3.2);
  tri(cx - 5, cy + 2.5, 2.6);
  tri(cx + 5, cy + 2.5, 2.6);
}

/** 🟠 Escort Velocity (speed): formation + speed chevrons */
function getEscortSpeedIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Orange speed family (distinct from thrust but harmonious)
  drawIconBase(ctx, '#ff9c3a', () => {}, 'fill', true);

  // Formation (dark accent for contrast)
  drawEscortFormation(ctx, cx, cy, '#442000');

  // Motion chevrons behind formation
  ctx.fillStyle = '#7a3c00';
  const chev = (x: number, y: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
  };
  // three progressive chevrons biased to the left-bottom → right-top thrust
  chev(cx - 7.5, cy + 0.5, 3.2, 2.2);
  chev(cx - 10.5, cy + 1.5, 2.7, 1.9);
  chev(cx - 13.0, cy + 2.2, 2.2, 1.6);

  // Subtle highlight tick to keep it punchy on dark UIs
  ctx.strokeStyle = '#ffd9b0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx + 2.5, cy - 4.0, 2.8, -0.9, -0.1);
  ctx.stroke();

  return canvas;
}

/** 🔴 Escort Firepower (damage): formation + burst ring + volley ticks */
function getEscortDamageIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Damage red family
  drawIconBase(ctx, '#ff4a56', () => {}, 'fill', true);

  // Formation (deep maroon)
  drawEscortFormation(ctx, cx, cy, '#2b0000');

  // Burst ring
  ctx.strokeStyle = '#600008';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 7.2, 0, Math.PI * 2);
  ctx.stroke();

  // Volley ticks (triad) suggesting synchronized fire
  ctx.strokeStyle = '#2b0000';
  ctx.lineWidth = 2;
  const ticks = [-20, 0, 20];
  for (const deg of ticks) {
    const a = (deg * Math.PI) / 180;
    const r1 = 3.8, r2 = 6.6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }

  // Small muzzle flashes at wing tips (subtle)
  ctx.fillStyle = '#ffd6d6';
  for (const [ox, oy] of [[-5, 2.5], [5, 2.5], [0, -1.5]]) {
    ctx.beginPath();
    ctx.arc(cx + ox, cy + oy - 3.8, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/** 🛡️✈️ Escort Damage Immunity (chance to ignore damage): escort formation + shield overlay */
function getEscortImmunityIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Defensive blue-green base (ties to armor but distinct for immunity)
  drawIconBase(ctx, '#4fb8ff', () => {}, 'fill', true);

  // Shield silhouette (scaled to leave room for formation)
  ctx.fillStyle = '#0b2b66';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx + 5, cy - 1);
  ctx.lineTo(cx + 4, cy + 3.8);
  ctx.lineTo(cx, cy + 6.5);
  ctx.lineTo(cx - 4, cy + 3.8);
  ctx.lineTo(cx - 5, cy - 1);
  ctx.closePath();
  ctx.fill();

  // Escort formation in front of shield (lighter ink to pop from shield)
  drawEscortFormation(ctx, cx, cy + 0.3, '#e6f2ff');

  // Immunity “null” slash
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 3.5, cy + 3.5);
  ctx.lineTo(cx + 3.5, cy - 3.5);
  ctx.stroke();

  // Subtle dark trim for contrast on bright UIs
  ctx.strokeStyle = '#06223a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, 8.5, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}


/** 🔵 Escort Bulwark (armor): formation on shield + crest line */
function getEscortArmorIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Armor blue family
  drawIconBase(ctx, '#3aa0ff', () => {}, 'fill', true);

  // Shield silhouette (shared language with armor nodes)
  ctx.fillStyle = '#0b2b66';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx + 6, cy - 2);
  ctx.lineTo(cx + 4.7, cy + 4.8);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx - 4.7, cy + 4.8);
  ctx.lineTo(cx - 6, cy - 2);
  ctx.closePath();
  ctx.fill();

  // Formation centered on shield face (lighter ink for separation)
  drawEscortFormation(ctx, cx, cy + 0.5, '#e6f2ff');

  // Crest line to sell "mitigation"
  ctx.strokeStyle = '#173f8f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 4.8);
  ctx.lineTo(cx, cy + 5.8);
  ctx.stroke();

  return canvas;
}


// 🛡️⚔️➡️ Escort Trifecta (hybrid: speed + damage + armor)
// Visual language:
// • Circular tri-split base: orange (speed), red (damage), blue (armor)
// • Escort formation (leader + two wings)
// • Speed chevrons (left/back), volley ticks (front), small shield backdrop
// • Hybrid interlocking rings overlay (shared hybrid grammar)
function getEscortHybridIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;
  const R = 9;

  // --- Circular mask tri-split base ---
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Tri wedge fills (clockwise: speed→damage→armor)
  // Speed (orange) — left/rear wedge
  ctx.fillStyle = '#ff8a1f';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R, Math.PI * 0.55, Math.PI * 1.3); // ~135° span
  ctx.closePath();
  ctx.fill();

  // Damage (red) — top/right wedge
  ctx.fillStyle = '#ff3b3b';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R, Math.PI * 1.3, Math.PI * 1.85); // ~99° span
  ctx.closePath();
  ctx.fill();

  // Armor (blue) — bottom/right wedge
  ctx.fillStyle = '#1f8fff';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R, Math.PI * 1.85, Math.PI * 0.55 + Math.PI * 2); // remaining span
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Slight base “punch” (readability)
  punchyBaseRings(ctx, cx, cy, 'rgba(0,0,0,0.22)', 'rgba(255,255,255,0.45)');

  // --- Shield backdrop (armor cue), kept compact to avoid clutter ---
  ctx.fillStyle = '#0b2b66';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5.5);
  ctx.lineTo(cx + 4.2, cy - 1.5);
  ctx.lineTo(cx + 3.3, cy + 3.6);
  ctx.lineTo(cx, cy + 6.1);
  ctx.lineTo(cx - 3.3, cy + 3.6);
  ctx.lineTo(cx - 4.2, cy - 1.5);
  ctx.closePath();
  ctx.fill();

  // --- Escort formation (leader + wings) ---
  const tri = (x: number, y: number, s: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.82, y + s * 0.9);
    ctx.lineTo(x - s * 0.82, y + s * 0.9);
    ctx.closePath();
    ctx.fill();
  };
  const shipInk = '#ffffff';
  tri(cx,     cy - 1.0, 3.0, shipInk); // leader
  tri(cx - 4.8, cy + 2.6, 2.4, shipInk);
  tri(cx + 4.8, cy + 2.6, 2.4, shipInk);

  // --- Speed chevrons (left/back) ---
  ctx.fillStyle = '#5a2600';
  const chev = (x: number, y: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
  };
  chev(cx - 8.5, cy + 0.4, 2.6, 1.8);
  chev(cx - 11.2, cy + 1.3, 2.2, 1.5);

  // --- Volley ticks (front) ---
  ctx.strokeStyle = '#2b0000';
  ctx.lineWidth = 2;
  for (const deg of [-12, 0, 12]) {
    const a = (deg * Math.PI) / 180;
    const r1 = 3.6, r2 = 6.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy - 1.0 + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy - 1.0 + Math.sin(a) * r2);
    ctx.stroke();
  }

  // --- Shield crest line (armor readability) ---
  ctx.strokeStyle = '#173f8f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 3.8);
  ctx.lineTo(cx, cy + 4.8);
  ctx.stroke();

  // --- Hybrid rings overlay (shared glyph language) ---
  drawHybridGlyphVivid(
    ctx, cx, cy,
    '#062033',           // dark stroke for rings (neutral slate)
    '#e8f4ff',           // highlight
    'rgba(0,0,0,0.35)'   // shadow
  );

  return canvas;
}

/** ❄️ Chill Prolonger (cold duration increase): snowflake burst */
function getColdDurationIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Icy base (offensive blue tint, not defensive armor)
  drawIconBase(ctx, '#66d9ff', () => {}, 'fill', true);

  // Radiating cold burst
  ctx.strokeStyle = '#004466';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 7.2, 0, Math.PI * 2);
  ctx.stroke();

  // Snowflake arms (sharper for offensive feel)
  ctx.strokeStyle = '#e0f8ff';
  ctx.lineWidth = 1.6;
  const arms: number[] = [0, 60, 120, 180, 240, 300];
  for (const deg of arms) {
    const a = (deg * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 1.2, cy + Math.sin(a) * 1.2);
    ctx.lineTo(cx + Math.cos(a) * 4.6, cy + Math.sin(a) * 4.6);
    ctx.stroke();
  }

  // Central icy core
  ctx.fillStyle = '#b3f0ff';
  ctx.beginPath();
  ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

/** 🔥 Scorch Intensifier (ignite damage increase): flame glyph + embers */
function getIgniteDamageIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Fiery base (bright offensive red-orange)
  drawIconBase(ctx, '#ff6633', () => {}, 'fill', true);

  // Stylized flame silhouette
  ctx.fillStyle = '#ffdd99';
  ctx.beginPath();
  ctx.moveTo(cx, cy + 4);
  ctx.bezierCurveTo(cx - 3, cy, cx - 2, cy - 4, cx, cy - 6);
  ctx.bezierCurveTo(cx + 2, cy - 4, cx + 3, cy, cx, cy + 4);
  ctx.closePath();
  ctx.fill();

  // Inner flame
  ctx.fillStyle = '#ff9933';
  ctx.beginPath();
  ctx.moveTo(cx, cy + 2);
  ctx.bezierCurveTo(cx - 1.5, cy - 0.5, cx - 1, cy - 3, cx, cy - 4.2);
  ctx.bezierCurveTo(cx + 1, cy - 3, cx + 1.5, cy - 0.5, cx, cy + 2);
  ctx.closePath();
  ctx.fill();

  // Floating embers
  ctx.fillStyle = '#ffe6cc';
  for (const [dx, dy] of [[-4, -2], [3, -3.5], [1, -6]]) {
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/** 🛡️ Status Immunity (chance to ignore status effects): shield + null/ban slash */
function getStatusImmunityIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Neutral-teal defensive base (distinct from kinetic ward & elemental resistances)
  drawIconBase(ctx, '#66ccb2', () => {}, 'fill', true);

  // Shield silhouette (universal defense shape)
  ctx.fillStyle = '#0b3a2b';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx + 6, cy - 2);
  ctx.lineTo(cx + 4.7, cy + 4.8);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx - 4.7, cy + 4.8);
  ctx.lineTo(cx - 6, cy - 2);
  ctx.closePath();
  ctx.fill();

  // Inner "null" symbol: circle + slash
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 3.2, cy + 3.2);
  ctx.lineTo(cx + 3.2, cy - 3.2);
  ctx.stroke();

  // Subtle dark trim for contrast on bright UIs
  ctx.strokeStyle = '#072d23';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, 4.8, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

/** ♻️✈️ Escort Resurrection Speed (replenishment): escort formation + revival arrow ring */
function getEscortResurrectionSpeedIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Revitalizing green base (distinct from harvest green, leaning toward teal for freshness)
  drawIconBase(ctx, '#3fd68c', () => {}, 'fill', true);

  // Escort formation in center (dark ink for contrast)
  drawEscortFormation(ctx, cx, cy, '#0e442a');

  // Revival arrow ring around formation
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0.25 * Math.PI, 1.75 * Math.PI, false); // almost full circle
  ctx.stroke();

  // Arrowhead at end of arc
  const arrowAngle = 1.75 * Math.PI;
  const arrowX = cx + Math.cos(arrowAngle) * 7;
  const arrowY = cy + Math.sin(arrowAngle) * 7;
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY);
  ctx.lineTo(arrowX - 2.5, arrowY - 1.5);
  ctx.lineTo(arrowX - 0.5, arrowY - 3.0);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Small spark/glint at top for “revival” energy
  ctx.strokeStyle = '#b6ffe0';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 9);
  ctx.lineTo(cx, cy - 7);
  ctx.moveTo(cx - 1, cy - 8);
  ctx.lineTo(cx + 1, cy - 8);
  ctx.stroke();

  return canvas;
}

/** 💠 Core Bonus (increased cores awarded at end of run): stacked core chips + sparkle */
function getCoreBonusIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Rich cyan-blue base (distinct from armor blue and escort cyan)
  drawIconBase(ctx, '#33c7ff', () => {}, 'fill', true);

  // Helper to draw a single core chip (hexagonal token)
  const drawCore = (x: number, y: number, r: number, fill: string, stroke: string) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // Back (offset) core — darker to suggest stacking
  drawCore(cx - 3, cy + 2.5, 3.5, '#0e4a66', '#0a2e40');

  // Middle core — medium shade
  drawCore(cx + 1, cy + 1, 3.5, '#1494bf', '#0a4d66');

  // Front core — bright to indicate value
  drawCore(cx + 4, cy - 2, 3.5, '#66e0ff', '#0e4a66');

  // Sparkles to convey reward
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.4;
  const sparkle = (sx: number, sy: number, s: number) => {
    ctx.beginPath(); ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy); ctx.stroke();
  };
  sparkle(cx - 6.5, cy - 4.5, 1.2);
  sparkle(cx + 6.5, cy + 4.0, 1.0);

  return canvas;
}

/** 🚀⏱ Jumpcast Speed (reduced jumpcast channel time): ship + shrinking arc timer */
function getJumpcastSpeedIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Energetic blue-violet base (ties to movement/teleportation, distinct from thrust orange)
  drawIconBase(ctx, '#6a8dff', () => {}, 'fill', true);

  // Stylized ship silhouette (forward-leaning, mid-jump)
  ctx.fillStyle = '#0b1f66';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5);
  ctx.lineTo(cx + 4, cy + 4);
  ctx.lineTo(cx - 4, cy + 4);
  ctx.closePath();
  ctx.fill();

  // Circular arc timer ring (partial, showing speed emphasis)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, -0.5 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  // Two "fast-forward" chevrons to indicate acceleration
  ctx.fillStyle = '#ffffff';
  const chev = (ox: number, oy: number) => {
    ctx.beginPath();
    ctx.moveTo(ox, oy - 2);
    ctx.lineTo(ox + 2, oy);
    ctx.lineTo(ox, oy + 2);
    ctx.closePath();
    ctx.fill();
  };
  chev(cx + 5, cy - 1);
  chev(cx + 7, cy);

  return canvas;
}

/** 🌐🚀 Global Jumpcast (jump from anywhere): ship + circular destination grid */
function getGlobalJumpcastIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Brighter electric teal base (global utility feel, distinct from speed’s violet)
  drawIconBase(ctx, '#33e0d0', () => {}, 'fill', true);

  // Stylized ship (same forward-leaning form for visual linkage with speed icon)
  ctx.fillStyle = '#004d47';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5);
  ctx.lineTo(cx + 4, cy + 4);
  ctx.lineTo(cx - 4, cy + 4);
  ctx.closePath();
  ctx.fill();

  // Concentric destination grid (suggesting universal reach)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.stroke();

  // Cardinal cross lines
  ctx.beginPath();
  ctx.moveTo(cx - 5.5, cy); ctx.lineTo(cx + 5.5, cy);
  ctx.moveTo(cx, cy - 5.5); ctx.lineTo(cx, cy + 5.5);
  ctx.stroke();

  // Small jump arc effect behind ship
  ctx.strokeStyle = '#b3fff8';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, Math.PI * 0.8, Math.PI * 1.2);
  ctx.stroke();

  return canvas;
}

/** 🎲 Lucky Dice (higher chance for random rolls to tier up a block) */
function getLuckyDiceIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Golden base for "luck" motif
  drawIconBase(ctx, '#ffcc4d', () => {}, 'fill', true);

  // Dice outline
  ctx.fillStyle = '#663c00';
  ctx.strokeStyle = '#663c00';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.rect(cx - 6, cy - 6, 12, 12);
  ctx.stroke();

  // Dice pips
  const pip = (px: number, py: number) => {
    ctx.beginPath();
    ctx.arc(px, py, 1.3, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.fillStyle = '#ffffff';
  pip(cx - 3, cy - 3);
  pip(cx + 3, cy - 3);
  pip(cx - 3, cy + 3);
  pip(cx + 3, cy + 3);
  pip(cx, cy);

  // Sparkle/star for "tier up" effect
  ctx.strokeStyle = '#fff5cc';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy - 6);
  ctx.moveTo(cx - 1, cy - 7);
  ctx.lineTo(cx + 1, cy - 7);
  ctx.stroke();

  return canvas;
}

/** 🔗 Double Combine (higher chance combining blocks will tier up) */
function getDoubleCombineIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Cool cyan base to differentiate from Lucky Dice's gold
  drawIconBase(ctx, '#4de0ff', () => {}, 'fill', true);

  // Two block icons linked together
  ctx.fillStyle = '#003544';
  ctx.beginPath();
  ctx.rect(cx - 7, cy - 3, 5, 5);
  ctx.rect(cx + 2, cy - 3, 5, 5);
  ctx.fill();

  // Link arc
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy - 0.5, 6, 0.2 * Math.PI, 0.8 * Math.PI, false);
  ctx.stroke();

  // Up-arrow inside link arc to signify "tier up"
  ctx.beginPath();
  ctx.moveTo(cx, cy - 5.5);
  ctx.lineTo(cx, cy - 8);
  ctx.moveTo(cx - 1.5, cy - 6.5);
  ctx.lineTo(cx, cy - 8);
  ctx.lineTo(cx + 1.5, cy - 6.5);
  ctx.stroke();

  return canvas;
}

/** ⚗️ Alchemist (combine up to Tier 5) */
function getAlchemistIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Deep purple base → "arcane mastery" theme
  drawIconBase(ctx, '#a44dff', () => {}, 'fill', true);

  // Alchemical flask silhouette
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 6);
  ctx.lineTo(cx - 3, cy - 1);
  ctx.arc(cx, cy - 1, 3, Math.PI, 0, false);
  ctx.lineTo(cx + 3, cy - 6);
  ctx.moveTo(cx - 3, cy - 6);
  ctx.lineTo(cx + 3, cy - 6);
  ctx.stroke();

  // Flask content gradient
  const grad = ctx.createLinearGradient(cx, cy - 3, cx, cy + 4);
  grad.addColorStop(0, '#ffd966'); // gold at top
  grad.addColorStop(1, '#ff6600'); // orange at bottom
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy + 3, 4, 0, Math.PI * 2);
  ctx.fill();

  // Tier 5 symbol → five-pointed star overlay
  ctx.strokeStyle = '#fff5cc';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const x = cx + Math.cos(a) * 4.5;
    const y = cy + Math.sin(a) * 4.5;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  return canvas;
}

/** 🚀 Rammer (reduces damage taken from collisions) */
function getRammerIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Steel-grey base for durability theme
  drawIconBase(ctx, '#7a8c99', () => {}, 'fill', true);

  // Ship nose silhouette (left-facing wedge)
  ctx.fillStyle = '#1e2b33';
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy);
  ctx.lineTo(cx + 4, cy - 5);
  ctx.lineTo(cx + 4, cy + 5);
  ctx.closePath();
  ctx.fill();

  // Impact "burst" lines on right side
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx + 5, cy);
  ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx + 5.5, cy - 2.5);
  ctx.lineTo(cx + 8.5, cy - 4);
  ctx.moveTo(cx + 5.5, cy + 2.5);
  ctx.lineTo(cx + 8.5, cy + 4);
  ctx.stroke();

  // Small shield overlay to reinforce "reduced damage"
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx - 1, cy, 3.5, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.lineTo(cx - 1, cy + 3.5);
  ctx.lineTo(cx - 3, cy + 2.5);
  ctx.stroke();

  return canvas;
}

/** Public API */

// Initialize once; idempotent
export function initializePassiveIconCache(): void {
  if (iconCache) return;

  iconCache = {
    // Root node
    'root-node-icon': getRootNodeIconSprite(),

    // Inner minor nodes
    'icon-damage': getDamageIconSprite(),
    'icon-armor': getArmorIconSprite(),
    'icon-thrust': getThrustIconSprite(),
    'icon-turnPower': getTurnPowerIconSprite(),
    'icon-blockDropRate': getBlockDropRateIconSprite(),
    'icon-harvest': getHarvestIconSprite(),
    'icon-ability': getAbilityIconSprite(),
    'icon-capitalist': getCapitalistIconSprite(),
    'icon-abilityCooldown': getAbilityCooldownIconSprite(),
    'icon-fireRate': getFireRateIconSprite(),
    'icon-armorMitigation': getArmorMitigationIconSprite(),
    'icon-repairBounty': getRepairBountyIconSprite(),
    'icon-repairAmplification': getRepairAmplificationIconSprite(),
    'icon-lifeStealChance': getLifeLeechChanceIconSprite(),
    'icon-lifeStealAmount': getLifeLeechAmountIconSprite(),
    'icon-vampiricHybrid': getVampiricHybridIconSprite(),
    'icon-coreBonus': getCoreBonusIconSprite(),
    'icon-rammer': getRammerIconSprite(),

    // block combining
    'icon-luckyDice': getLuckyDiceIconSprite(),
    'icon-doubleCombine': getDoubleCombineIconSprite(),
    'icon-alchemist': getAlchemistIconSprite(),

    // jump cast
    'icon-jumpcastSpeed': getJumpcastSpeedIconSprite(),
    'icon-globalJumpcast': getGlobalJumpcastIconSprite(),

    // hybrid nodes
    'icon-damageHybrid': getDamageHybridIconSprite(),
    'icon-armorHybrid': getArmorHybridIconSprite(),
    'icon-thrustHybrid': getThrustHybridIconSprite(),
    'icon-capitalistHybrid': getCapitalistHybridIconSprite(),

    // capstone minor icons
    'icon-slayerMinor': getSlayerMinorIconSprite(),
    'icon-atronachMinor': getAtronachMinorIconSprite(),
    'icon-voidwalkerMinor': getVoidwalkerMinorIconSprite(),
    'icon-incidentInvestigatorMinor': getIncidentInvestigatorMinorIconSprite(),
    'icon-builderMinor': getBuilderMinorIconSprite(),
    'icon-trademasterMinor': getTrademasterMinorIconSprite(),
    'icon-explorerMinor': getExplorerMinorIconSprite(),
    'icon-bossMasteryMinor': getBossMasteryMinorIconSprite(),

    // capstone icons
    'icon-slayer': getSlayerIconSprite(),
    'icon-atronach': getAtronachIconSprite(),
    'icon-voidwalker': getVoidwalkerIconSprite(),
    'icon-incidentInvestigator': getIncidentInvestigatorIconSprite(),
    'icon-builder': getBuilderIconSprite(),
    'icon-trademaster': getTrademasterIconSprite(),
    'icon-explorer': getExplorerIconSprite(),
    'icon-bossMastery': getBossMasteryIconSprite(),

    // Elemental nodes
    'icon-mithradite': getMithraditeIconSprite(),
    'icon-acclimatization': getAcclimatizationIconSprite(),
    'icon-thermalInsulation': getThermalInsulationIconSprite(),
    'icon-elementalWardHybrid': getElementalWardHybridIconSprite(),
    'icon-coldDuration': getColdDurationIconSprite(),
    'icon-igniteDamage': getIgniteDamageIconSprite(),
    'icon-statusImmunity': getStatusImmunityIconSprite(),

    // Movement resistance nodes
    'icon-kineticWard': getKineticWardIconSprite(),

    // Powerup related
    'icon-powerSurge': getPowerSurgeIconSprite(),
    'icon-epicInfusion': getEpicInfusionIconSprite(),

    // Escort buffs
    'icon-escortSpeed':  getEscortSpeedIconSprite(),
    'icon-escortDamage': getEscortDamageIconSprite(),
    'icon-escortArmor':  getEscortArmorIconSprite(),
    'icon-escortHybrid': getEscortHybridIconSprite(),
    'icon-escortImmunity': getEscortImmunityIconSprite(),
    'icon-escortResurrectionSpeed': getEscortResurrectionSpeedIconSprite(),

    // Explicit fallback registration (optional external usage)
    'icon-fallback': fallbackSprite,
  };
}

export function destroyPassiveIconCache(): void {
  iconCache = null;
}

/**
 * Resolves a cached passive icon sprite for the given key.
 * Returns a high-contrast fallback if uninitialized or missing.
 */
export function resolvePassiveIconSprite(icon: string): HTMLCanvasElement {
  if (!iconCache) {
    console.warn(`[PassiveIconCache] Attempted to resolve before initialization: ${icon}`);
    return fallbackSprite;
  }
  const sprite = iconCache[icon];
  if (!sprite) {
    console.warn(`[PassiveIconCache] Unrecognized icon key: ${icon}`);
    return iconCache['icon-fallback'] ?? fallbackSprite;
  }
  return sprite;
}
