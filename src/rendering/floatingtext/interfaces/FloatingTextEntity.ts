/*───────────────────────────────────────────────────────────────────────────────
  FloatingTextEntity.ts —  *GC‑neutral* floating‑damage text renderer
────────────────────────────────────────────────────────────────────────────────
  • Zero per‑frame allocations (no closures, no {x,y} literals, no new arrays)
  • Canvas elements, entities, and text‑metrics are all pooled.
  • Position is pushed in by the manager each frame to avoid per‑entity lambdas.
─────────────────────────────────────────────────────────────────────────────*/

import type { FloatingTextBehaviorOptions } from '@/rendering/floatingtext/interfaces/FloatingTextBehaviorOptions';

/*──────────────────────────────  Constants  ────────────────────────────────*/
const NEON_COLOR_CYCLE = [
  '#FF00FF', '#00FFFF', '#FFFF00', '#00FF00',
  '#FF0000', '#00CCFF', '#FF8800',
] as const;

const COLOR_CYCLE_INTERVAL    = 0.05;   // s
const IMPACT_SCALE_DURATION   = 0.35;   // s
const TEXT_CANVAS_RESOLUTION  = 1;      // device‑pixel multiplier
const CANVAS_PADDING_PX       = 8;

/*────────────────────────────  Canvas Pool  ───────────────────────────────*/
class CanvasPool {
  private static readonly pool: HTMLCanvasElement[] = [];

  /** Obtain a cleared off‑screen canvas. */
  static acquire(): HTMLCanvasElement {
    return this.pool.pop() ?? document.createElement('canvas');
  }

  /** Return the canvas to the pool and release GPU memory. */
  static release(canvas: HTMLCanvasElement): void {
    canvas.width  = 0;   // forces browser to discard the backing store
    canvas.height = 0;
    this.pool.push(canvas);
  }
}

/*───────────────────────────  TextMetrics Cache  ───────────────────────────*/
class TextMetricsCache {
  private static readonly cache = new Map<string, TextMetrics>();
  private static readonly probe = document
    .createElement('canvas')
    .getContext('2d')!;

  static get(text: string, font: string): TextMetrics {
    const key = `${text}∥${font}`;            // composite key
    let m = this.cache.get(key);
    if (!m) {
      this.probe.font = font;
      m = this.probe.measureText(text);
      this.cache.set(key, m);
    }
    return m;
  }

  static clear(): void {
    this.cache.clear();
  }
}

/*────────────────────────────  FloatingTextEntity  ──────────────────────────*/
export class FloatingTextEntity {
  /*‐‐ Runtime mutables ‐‐*/
  public x = 0;
  public y = 0;

  public text = '';
  public numeric = NaN;

  public elapsed = 0;
  public yOffset = 0;
  public alpha   = 1;

  private colorCycleIdx   = 0;
  private colorCycleClock = 0;

  /*‐‐ Cached rendering data ‐‐*/
  private canvas!: HTMLCanvasElement;
  private canvasW = 0;
  private canvasH = 0;

  /*‐‐ Construction invariants (reset on reuse) ‐‐*/
  private originalFontSize = 14;
  private fontSize         = 14;
  private fontFamily       = 'monospace';
  public life             = 0.6;
  private speed            = 30;
  private color            = '#FFFFFF';
  private behavior?: FloatingTextBehaviorOptions;

  /*──────────────────────  Pool integration  ─────────────────────────────*/
  private static readonly pool: FloatingTextEntity[] = [];

  /** Acquire a reset entity from the pool (or create one). */
  static acquire(
    text:      string,
    fontSize:  number,
    fontFamily:string,
    life:      number,
    speed:     number,
    alpha:     number,
    color:     string,
    behavior?: FloatingTextBehaviorOptions,
  ): FloatingTextEntity {
    const e = this.pool.pop() ?? new FloatingTextEntity();
    e.reset(text, fontSize, fontFamily, life, speed, alpha, color, behavior);
    return e;
  }

  /** Return the entity (and its canvas) to their respective pools. */
  static release(e: FloatingTextEntity): void {
    CanvasPool.release(e.canvas);
    this.pool.push(e);
  }

  /** Reset all state so the object is indistinguishable from new. */
  private reset(
    text:      string,
    fontSize:  number,
    fontFamily:string,
    life:      number,
    speed:     number,
    alpha:     number,
    color:     string,
    behavior?: FloatingTextBehaviorOptions,
  ): void {
    /* basic scalars */
    this.originalFontSize = fontSize;
    this.fontSize         = fontSize;
    this.fontFamily       = fontFamily;
    this.life             = life;
    this.speed            = speed;
    this.alpha            = alpha;
    this.color            = color;
    this.behavior         = behavior;

    this.text = text;
    this.numeric = parseFloat(text);

    /* runtime mutables */
    this.elapsed = 0;
    this.yOffset = 0;
    this.colorCycleIdx   = 0;
    this.colorCycleClock = 0;

    /* regenerate text bitmap */
    this.canvas = this.renderTextCanvas(text);
  }

  /*──────────────────────────  Canvas generation  ────────────────────────*/
  private renderTextCanvas(text: string): HTMLCanvasElement {
    const cvs  = CanvasPool.acquire();
    const ctx  = cvs.getContext('2d')!;
    const res  = TEXT_CANVAS_RESOLUTION;
    const px   = Math.round(this.originalFontSize * res);
    const font = `${px}px ${this.fontFamily}`;

    const m  = TextMetricsCache.get(text, font);
    this.canvasW = Math.ceil(m.width)   + CANVAS_PADDING_PX * 2 * res;
    this.canvasH = Math.ceil(px * 1.2) + CANVAS_PADDING_PX * 2 * res;

    cvs.width  = this.canvasW;
    cvs.height = this.canvasH;

    ctx.font = font;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = this.behavior?.multiColor ? '#FFFFFF' : this.color;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillText(text, cvs.width / 2, cvs.height / 2);

    return cvs;
  }

  /*──────────────────────────────  Update  ──────────────────────────────*/
  update(dt: number): void {
    this.elapsed += dt;
    this.yOffset -= this.speed * dt;

    /* Impact scale easing */
    if (this.behavior?.impactScale) {
      const t = Math.min(this.elapsed / IMPACT_SCALE_DURATION, 1);
      const scale = 1 + (this.behavior.impactScale - 1) * (1 - t);
      this.fontSize = this.originalFontSize * scale;
    }

    /* Neon color cycling */
    if (this.behavior?.multiColor) {
      this.colorCycleClock += dt;
      if (this.colorCycleClock >= COLOR_CYCLE_INTERVAL) {
        this.colorCycleClock -= COLOR_CYCLE_INTERVAL;
        this.colorCycleIdx    = (this.colorCycleIdx + 1) % NEON_COLOR_CYCLE.length;
        this.color            = NEON_COLOR_CYCLE[this.colorCycleIdx];
      }
    }

    /* Fade‑out alpha */
    if (this.behavior?.fadeOut !== false) {
      const remaining = Math.max(0, this.life - this.elapsed);
      this.alpha = Math.min(1, remaining / this.life);
    }
  }

  /** Replace the visible text in‑place and regenerate the cached bitmap. */
  updateText(newText: string): void {
    if (this.text === newText) return;      // hot‑path guard

    this.text    = newText;
    this.numeric = +newText;                // unary + is fastest parse

    const res  = TEXT_CANVAS_RESOLUTION;
    const px   = Math.round(this.originalFontSize * res);
    const font = `${px}px ${this.fontFamily}`;

    // Recompute metrics
    const m  = TextMetricsCache.get(newText, font);
    this.canvasW = Math.ceil(m.width)   + CANVAS_PADDING_PX * 2 * res;
    this.canvasH = Math.ceil(px * 1.2) + CANVAS_PADDING_PX * 2 * res;

    // Resize in‑place (one backing‑store reset)
    this.canvas.width  = this.canvasW;
    this.canvas.height = this.canvasH;

    // Redraw
    const ctx = this.canvas.getContext('2d')!;
    ctx.font = font;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = this.behavior?.multiColor ? '#FFFFFF' : this.color;
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    ctx.fillText(newText, this.canvasW / 2, this.canvasH / 2);
  }

  /*──────────────────────────────  Render  ──────────────────────────────*/
  render(ctx: CanvasRenderingContext2D): void {
    const impactScale = this.fontSize / this.originalFontSize;
    const dw = (this.canvasW / TEXT_CANVAS_RESOLUTION) * impactScale;
    const dh = (this.canvasH / TEXT_CANVAS_RESOLUTION) * impactScale;

    const dx = this.x - dw / 2;
    const dy = this.y + this.yOffset - dh / 2;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.drawImage(this.canvas, dx, dy, dw, dh);

    if (this.behavior?.multiColor) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = this.color;
      ctx.fillRect(dx, dy, dw, dh);
    }
    ctx.restore();
  }

  /*──────────────────────────────  Expiry  ──────────────────────────────*/
  isExpired(): boolean {
    return this.elapsed >= this.life;
  }
}

/*──────────────────────────  Manager‑side Usage  ───────────────────────────

import { FloatingTextEntity } from '@/rendering/floatingtext/FloatingTextEntity';

/* … inside FloatingTextManager.update(): */
// entity.x = camera.worldToScreenX(wx, wy);
// entity.y = camera.worldToScreenY(wx, wy);
// entity.update(dt);

// when expired:
// FloatingTextEntity.release(entity);
