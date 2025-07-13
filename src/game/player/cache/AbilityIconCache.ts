// src/game/player/cache/AbilityIconCache.ts

// ────────────────────────────────────────────────────────────────────────────
//  AbilityIconCache.ts   •   128-px placeholder sprites
// ────────────────────────────────────────────────────────────────────────────

/*  Constants  */
const SIZE      = 128;
const HALF      = SIZE / 2;
const STROKE_W  = 8;     // uniform outline thickness
const GLOW_BLUR = 32;    // more pronounced at larger res

/*  Utilities  */
function makeCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  return c;
}

function drawIconBase(
  ctx: CanvasRenderingContext2D,
  glow: string,
  shape: (c: CanvasRenderingContext2D) => void,
): void {
  ctx.shadowColor = glow;
  ctx.shadowBlur  = GLOW_BLUR;
  ctx.fillStyle   = glow;
  shape(ctx); ctx.fill();

  ctx.shadowBlur = 0;
  ctx.lineWidth  = STROKE_W;
  ctx.strokeStyle = '#000';
  shape(ctx); ctx.stroke();
}

/* 1 ▪ Pulse */
const pulseIcon = makeCanvas();
{
  const ctx = pulseIcon.getContext('2d')!;
  drawIconBase(ctx, '#ff6e3c', c => {
    c.beginPath(); c.arc(HALF, HALF, HALF * 0.55, 0, Math.PI * 2);
  });

  ctx.lineWidth = STROKE_W * 0.4;
  ctx.strokeStyle = '#fff6';
  ctx.beginPath(); ctx.arc(HALF, HALF, HALF * 0.25, 0, Math.PI * 2); ctx.stroke();
}

/* ──────────────────────────────────────────────────────────────────────────
   ATTACH-BLOCK  •  128 × 128  •  CRT-style frame + single block glyph
   Size-matched to the die square in rollBlocksIcon (56 px on a 128 px canvas)
   ────────────────────────────────────────────────────────────────────────── */
const attachBlockIcon = makeCanvas();
{
  const ctx = attachBlockIcon.getContext('2d')!;
  ctx.save();

  /* —— Palette —— */
  const BORDER = '#00FFFF';
  const FILL   = '#001122';
  const BLOCK  = '#00FFFF';

  /* —— Outer rounded frame —— */
  ctx.fillStyle   = FILL;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth   = STROKE_W;        // 8 px outline
  const RADIUS = 16;                 // corner radius
  ctx.roundRect(0, 0, SIZE, SIZE, RADIUS);
  ctx.fill();
  ctx.stroke();

  /* —— Central block —— */
  const blockSize = SIZE * 0.44;     // ≈56 px @128 — matches dieSize
  const blockXY   = (SIZE - blockSize) / 2;

  ctx.fillStyle   = BLOCK;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth   = STROKE_W * 0.75; // thinner inner outline (6 px)
  ctx.roundRect(blockXY, blockXY, blockSize, blockSize, RADIUS * 0.4);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/* ──────────────────────────────────────────────────────────────────────────
   ATTACH-ALL-BLOCKS  (CRT frame + 3-block triangle)  » 128 × 128
   Replace the previous attachAllIcon definition with this version.
   ────────────────────────────────────────────────────────────────────────── */
const attachAllIcon = makeCanvas();
{
  const ctx = attachAllIcon.getContext('2d')!;
  ctx.save();

  /* —— Palette —— */
  const BORDER = '#00FFFF';
  const FILL   = '#001122';
  const BLOCK  = '#00FFFF';

  /* —— Outer rounded frame —— */
  ctx.fillStyle   = FILL;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth   = STROKE_W;            // 8 px outline
  const RADIUS = 16;
  ctx.roundRect(0, 0, SIZE, SIZE, RADIUS);
  ctx.fill();
  ctx.stroke();

  /* —— Triangle geometry —— */
  const centerX = HALF;                  // 64
  const centerY = HALF;
  const triR    = SIZE * 0.28;           // ~36 px distance from centre
  const blockSz = SIZE * 0.22;           // ~28 px square

  const angles = [
    -Math.PI / 2,                        // top
    2 * Math.PI / 3 - Math.PI / 2,       // bottom-left
    4 * Math.PI / 3 - Math.PI / 2,       // bottom-right
  ] as const;

  ctx.fillStyle   = BLOCK;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth   = STROKE_W * 0.75;     // inner border thinner

  for (const a of angles) {
    const cx = centerX + triR * Math.cos(a);
    const cy = centerY + triR * Math.sin(a);

    ctx.beginPath();
    ctx.roundRect(
      cx - blockSz / 2,
      cy - blockSz / 2,
      blockSz,
      blockSz,
      RADIUS * 0.4,
    );
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/* ──────────────────────────────────────────────────────────────────────────
   ROLL-BLOCKS  (CRT frame + 6-pip die)  » 128 × 128
   ────────────────────────────────────────────────────────────────────────── */
const rollBlocksIcon = makeCanvas();
{
  const ctx = rollBlocksIcon.getContext('2d')!;
  ctx.save();

  /* —— Palette —— */
  const BORDER = '#00FFFF';
  const FILL   = '#001122';
  const PIPS   = '#00FFFF';

  /* —— Outer frame —— */
  ctx.fillStyle   = FILL;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth   = STROKE_W;        // 8 px outline
  const RADIUS = 16;
  ctx.roundRect(0, 0, SIZE, SIZE, RADIUS);
  ctx.fill();
  ctx.stroke();

  /* —— Die square —— */
  const dieSize = SIZE * 0.44;       // ≈ 56 px
  const dieX    = (SIZE - dieSize) / 2;
  const dieY    = dieX;

  ctx.fillStyle   = FILL;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth   = STROKE_W * 0.75; // inner border thinner
  ctx.roundRect(dieX, dieY, dieSize, dieSize, RADIUS * 0.4);
  ctx.fill();
  ctx.stroke();

  /* —— Six pips (3 × 2 grid) —— */
  const cols = 3, rows = 2;
  const pipR = dieSize * 0.08;       // radius ≈ 4.5 px @128
  const cellW = dieSize / cols;
  const cellH = dieSize / rows;
  const baseX = dieX + cellW  / 2;
  const baseY = dieY + cellH / 2;

  ctx.fillStyle = PIPS;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = baseX + c * cellW;
      const cy = baseY + r * cellH;
      ctx.beginPath();
      ctx.arc(cx, cy, pipR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/* ──────────────────────────────────────────────────────────────────────────
   COMBINE-BLOCKS  (CRT frame + block + upward arrow)  » 128 × 128
   ────────────────────────────────────────────────────────────────────────── */
const combineBlocksIcon = makeCanvas();
{
  const ctx = combineBlocksIcon.getContext('2d')!;
  ctx.save();

  /* —— Palette —— */
  const BORDER = '#00FFFF';
  const FILL   = '#001122';
  const GLYPH  = '#00FFFF';

  /* —— Outer CRT frame —— */
  const RADIUS = 16;
  ctx.fillStyle   = FILL;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth   = STROKE_W;          // 8-px outline
  ctx.roundRect(0, 0, SIZE, SIZE, RADIUS);
  ctx.fill();
  ctx.stroke();

  /* —— Block glyph —— */
  const blockSize = SIZE * 0.32;       // ≈ 41 px
  const blockX    = (SIZE - blockSize) / 2;
  const blockY    = SIZE * 0.58;       // positioned ~3/5 down

  ctx.fillStyle   = GLYPH;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth   = STROKE_W * 0.75;
  ctx.roundRect(blockX, blockY, blockSize, blockSize, RADIUS * 0.35);
  ctx.fill();
  ctx.stroke();

  /* —— Upward arrow —— */
  const tipY       = SIZE * 0.12;      // arrow tip
  const baseY      = blockY - SIZE * 0.12;
  const stemWidth  = STROKE_W * 0.6;   // width of vertical stem
  const halfStem   = stemWidth / 2;

  ctx.beginPath();
  ctx.fillStyle = GLYPH;

  // arrow head
  ctx.moveTo(HALF,           tipY);
  ctx.lineTo(HALF - SIZE*0.06, baseY);
  ctx.lineTo(HALF - halfStem,  baseY);
  // vertical stem down to block
  ctx.lineTo(HALF - halfStem,  blockY - STROKE_W);
  ctx.lineTo(HALF + halfStem,  blockY - STROKE_W);
  ctx.lineTo(HALF + halfStem,  baseY);
  ctx.lineTo(HALF + SIZE*0.06, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/* 6 ▪ Jump Cast */
const jumpCastIcon = makeCanvas();
{
  const ctx = jumpCastIcon.getContext('2d')!;
  drawIconBase(ctx, '#ff3cf8', c => {
    c.moveTo(SIZE * 0.3, SIZE * 0.2);
    c.lineTo(SIZE * 0.8, HALF);
    c.lineTo(SIZE * 0.3, SIZE * 0.8);
    c.closePath();
  });

  ctx.lineWidth = STROKE_W * 0.6;
  ctx.strokeStyle = '#fff6';
  ctx.beginPath();
  ctx.moveTo(SIZE * 0.1, HALF);
  ctx.lineTo(SIZE * 0.55, HALF);
  ctx.stroke();
}

/*  Registry  */
const iconMap: Record<string, () => HTMLCanvasElement> = {
  'icon-pulse':           () => pulseIcon,
  'icon-attach-block':    () => attachBlockIcon,
  'icon-attach-all':      () => attachAllIcon,
  'icon-roll-blocks':     () => rollBlocksIcon,
  'icon-combine-blocks':  () => combineBlocksIcon,
  'icon-jump-cast':       () => jumpCastIcon,
};

/*  Fallback  */
const fallback = (() => {
  const c = makeCanvas();
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ff00ff'; ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.lineWidth = STROKE_W; ctx.strokeStyle = '#000';
  ctx.strokeRect(0, 0, SIZE, SIZE);
  return c;
})();

/*  Public resolver  */
export function resolveAbilityIconSprite(icon: string): HTMLCanvasElement {
  const g = iconMap[icon];
  if (!g) {
    console.warn(`[AbilityIconCache] Unrecognized icon key: ${icon}`);
    return fallback;
  }
  return g();
}
