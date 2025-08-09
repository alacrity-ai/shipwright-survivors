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

// === Hybrid Glyph Helper ===
// Interlocking rings rendered over a category-colored base tile.
// Compact, legible at 24x24; reads as "combined / dual".
function drawHybridGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, strokeDark: string, highlight: string) {
  ctx.strokeStyle = strokeDark;
  ctx.lineWidth = 2;

  // Two linked circles
  const r = 4.5;
  ctx.beginPath();
  ctx.arc(cx - 3, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx + 3, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Overlap accent (small diamond)
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 1.5);
  ctx.lineTo(cx + 1.5, cy);
  ctx.lineTo(cx, cy + 1.5);
  ctx.lineTo(cx - 1.5, cy);
  ctx.closePath();
  ctx.fill();

  // Tiny sparkle to increase readability
  ctx.strokeStyle = highlight;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx + 6.5, cy - 5.5); ctx.lineTo(cx + 6.5, cy - 3.8);
  ctx.moveTo(cx + 5.6, cy - 4.6); ctx.lineTo(cx + 7.4, cy - 4.6);
  ctx.stroke();
}

// 🔴 Damage Hybrid (red family)
function getDamageHybridIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  // Slightly punchier red than damage base to differentiate
  drawIconBase(ctx, '#ff5a5a', () => {}, 'fill', true);
  drawHybridGlyph(ctx, cx, cy, '#2b0000', '#ffd6d6');
  return canvas;
}

// 🔵 Armor Hybrid (blue family)
function getArmorHybridIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#3aa0ff', () => {}, 'fill', true);
  drawHybridGlyph(ctx, cx, cy, '#0b2b66', '#d6ecff');
  return canvas;
}

// 🟠 Thrust Hybrid (orange family)
function getThrustHybridIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#ff9933', () => {}, 'fill', true);
  drawHybridGlyph(ctx, cx, cy, '#7a3c00', '#ffe7cc');
  return canvas;
}

// 🟡 Capitalist Hybrid (gold family)
function getCapitalistHybridIconSprite(): HTMLCanvasElement {
  const canvas = createCanvas(24, 24);
  const ctx = canvas.getContext('2d')!;
  const cx = 12, cy = 12;

  drawIconBase(ctx, '#f6c945', () => {}, 'fill', true);
  drawHybridGlyph(ctx, cx, cy, '#8a6b00', '#fff7cf');
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

  drawIconBase(ctx, '#ff3b3b', () => {}, 'fill', true);

  // radial burst ticks
  ctx.strokeStyle = '#2b0000';
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
  ctx.fillStyle = '#2b0000';
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
  drawIconBase(ctx, '#ff7070', () => {}, 'fill', true);

  ctx.fillStyle = '#2b0000';
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
