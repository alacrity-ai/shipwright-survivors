/*─────────────────────────────────────────────────────────────────────────────
  FloatingTextManager.ts — companion for the GC‑neutral FloatingTextEntity
─────────────────────────────────────────────────────────────────────────────
  • No per‑frame array reallocations (in‑place compaction).
  • No per‑entity closures; manager resolves screen/world positions.
  • Entities are obtained from—and returned to—the internal pool.
────────────────────────────────────────────────────────────────────────────*/

import { FloatingTextEntity }          from '@/rendering/floatingtext/interfaces/FloatingTextEntity';
import { CanvasManager }               from '@/core/CanvasManager';
import { getUniformScaleFactor }       from '@/config/view';
import type { FloatingTextBehaviorOptions } from '@/rendering/floatingtext/interfaces/FloatingTextBehaviorOptions';
import type { Camera }                 from '@/core/Camera';

/*──────────────────────────────  Helper types  ─────────────────────────────*/
type ChannelRec = { entity: FloatingTextEntity; lastUpdate: number };

interface ScreenSource {
  kind: 'screen';
  x: number;
  y: number;
}

interface WorldSource {
  kind: 'world';
  wx: number;
  wy: number;
  camera: Camera;
}

type Source = ScreenSource | WorldSource;

/*────────────────────────────  Configuration  ──────────────────────────────*/
const ADDITIONAL_FONT_SCALE   = 1.25;
const MERGE_WINDOW_MS         = 50;

/*────────────────────────────  Manager Class  ──────────────────────────────*/
export class FloatingTextManager {
  /** Parallel arrays keep GC pressure minimal. */
  private readonly entities: FloatingTextEntity[] = [];
  private readonly sources:  Source[]             = [];

  private readonly channelMap: Map<string, ChannelRec> = new Map();

  private readonly ctx: CanvasRenderingContext2D;
  private readonly scale: number;

  constructor() {
    const cm  = CanvasManager.getInstance();
    this.ctx  = cm.getContext('ui');
    this.scale = getUniformScaleFactor() * ADDITIONAL_FONT_SCALE;
  }

  /*──────────────────────────────  Update  ───────────────────────────────*/
  public update(dt: number): void {
    const ents  = this.entities;
    const srcs  = this.sources;
    let   write = 0;

    for (let i = 0; i < ents.length; ++i) {
      const e = ents[i];
      const s = srcs[i];

      /* Resolve position without allocations */
      if (s.kind === 'screen') {
        e.x = s.x;
        e.y = s.y;
      } else {
        const { x, y } = s.camera.worldToScreen(s.wx, s.wy);
        e.x = x;
        e.y = y;
      }

      e.update(dt);

      if (!e.isExpired()) {
        /* Keep entity / source in‑place */
        ents[write] = e;
        srcs[write] = s;
        ++write;
      } else {
        /* Recycle entity */
        FloatingTextEntity.release(e);
      }
    }
    ents.length = srcs.length = write;        // truncate “dead tail”
  }

  /*──────────────────────────────  Render  ───────────────────────────────*/
  public render(): void {
    for (const e of this.entities) e.render(this.ctx);
  }

  /*──────────────────────────────  Clear   ───────────────────────────────*/
  public clear(): void {
    for (const e of this.entities) FloatingTextEntity.release(e);
    this.entities.length = this.sources.length = 0;
    this.channelMap.clear();
  }

  /*──────────────────────  Public Creation Helpers  ──────────────────────*/
  public createScreenText(
    text:      string,
    x:         number,
    y:         number,
    fontSize   = 14,
    fontFamily = 'monospace',
    life       = 0.6,
    speed      = 30,
    alpha      = 1.0,
    color      = '#FFFFFF',
    behavior?: FloatingTextBehaviorOptions,
    channel?:  string,
  ): void {
    const src: ScreenSource = { kind: 'screen', x, y };
    this.create(text, src, fontSize, fontFamily, life, speed, alpha, color, behavior, channel);
  }

  public createWorldText(
    text:      string,
    wx:        number,
    wy:        number,
    camera:    Camera,
    fontSize   = 14,
    fontFamily = 'monospace',
    life       = 0.6,
    speed      = 30,
    alpha      = 1.0,
    color      = '#FFFFFF',
    behavior?: FloatingTextBehaviorOptions,
    channel?:  string,
  ): void {
    const src: WorldSource = { kind: 'world', wx, wy, camera };
    this.create(text, src, fontSize, fontFamily, life, speed, alpha, color, behavior, channel);
  }

  /*────────────────────────  Core creation path  ─────────────────────────*/
  private create(
    text:      string,
    src:       Source,
    fontSize:  number,
    fontFamily:string,
    life:      number,
    speed:     number,
    alpha:     number,
    color:     string,
    behavior?: FloatingTextBehaviorOptions,
    channel?:  string,
  ): void {
    /* ── Channel merge (numeric accumulation) ───────────────────────────*/
    const now = performance.now();
    if (channel) {
      const rec = this.channelMap.get(channel);
      if (rec && now - rec.lastUpdate < MERGE_WINDOW_MS) {
        const a = parseFloat(rec.entity['text' as keyof FloatingTextEntity] as any);
        const b = parseFloat(text);
        if (!isNaN(a) && !isNaN(b)) {
          rec.entity['text' as keyof FloatingTextEntity] = `${Math.round(a + b)}` as any;
          rec.entity['alpha']   = 1;
          rec.entity['life']    = life;
          rec.lastUpdate        = now;
          return;
        }
      }
    }

    /* ── Pool‑aware entity acquisition ───────────────────────────────────*/
    const e = FloatingTextEntity.acquire(
      text,
      fontSize * this.scale,
      fontFamily,
      life,
      speed,
      alpha,
      color,
      behavior,
    );

    /* Initial position resolve */
    if (src.kind === 'screen') {
      e.x = src.x;
      e.y = src.y;
    } else {
      const { x, y } = src.camera.worldToScreen(src.wx, src.wy);
      e.x = x;
      e.y = y;
    }

    /* Append to parallel arrays */
    this.entities.push(e);
    this.sources.push(src);

    if (channel) this.channelMap.set(channel, { entity: e, lastUpdate: now });
  }
}
