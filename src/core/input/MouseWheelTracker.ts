// src/core/input/MouseWheelTracker.ts

/**
 * High-resolution mouse wheel normalizer with tick semantics.
 * - Converts arbitrary wheel deltas (mice + trackpads) into integer "ticks".
 * - GC-neutral: no per-frame allocations; consumer drains a signed tick count.
 * - Optional preventDefault scoping to a specific element subtree.
 */
export class MouseWheelTracker {
  // Config
  private readonly pixelsPerTick: number;
  private readonly preventDefault: boolean;
  private readonly target: HTMLElement | Window;
  private readonly scopeElement: HTMLElement | null; // if provided, only consume when the event is within this element

  // State
  private enabled = true;
  private wheelPxAccum = 0;          // accumulated pixel delta (remainder preserved)
  private latchedSignedTicks = 0;    // positive = "zoom in" (wheel up), negative = "zoom out" (wheel down)

  // Bound handler, typed as EventListener to satisfy addEventListener/removeEventListener
  private readonly onWheelBound: EventListener = (ev: Event) => this.onWheel(ev);

  /**
   * @param target       The event target to listen on (e.g., window or a canvas container).
   * @param options
   *  - pixelsPerTick    Pixel delta that constitutes one logical "tick" (default 100).
   *  - preventDefault   If true, calls preventDefault to block page scrolling (default true).
   *  - scopeElement     If set, only process + preventDefault when the event target is inside this element.
   */
  constructor(
    target: HTMLElement | Window,
    options?: {
      pixelsPerTick?: number;
      preventDefault?: boolean;
      scopeElement?: HTMLElement | null;
    }
  ) {
    this.target = target;
    this.pixelsPerTick = Math.max(1, options?.pixelsPerTick ?? 100);
    this.preventDefault = options?.preventDefault ?? true;
    this.scopeElement = options?.scopeElement ?? (target instanceof HTMLElement ? target : null);

    // IMPORTANT: passive:false allows preventDefault() to actually work.
    this.target.addEventListener('wheel', this.onWheelBound, { passive: false });
  }

  /** Enable/disable tracking without removing listeners. */
  public setEnabled(v: boolean): void { this.enabled = v; }
  public isEnabled(): boolean { return this.enabled; }

  /**
   * Drain and return the signed tick count since last drain.
   * Positive => wheel up (zoom in). Negative => wheel down (zoom out).
   */
  public drainSignedTicks(): number {
    const t = this.latchedSignedTicks;
    if (t !== 0) this.latchedSignedTicks = 0;
    return t;
  }

  /** Reset internal accumulators (useful when switching UI contexts). */
  public reset(): void {
    this.wheelPxAccum = 0;
    this.latchedSignedTicks = 0;
  }

  /** Remove event listeners; call when the owning UI is destroyed. */
  public destroy(): void {
    this.target.removeEventListener('wheel', this.onWheelBound);
  }

  // --- Internal ---

  private onWheel(ev: Event): void {
    if (!this.enabled) return;

    // Narrow to WheelEvent defensively
    const e = ev as WheelEvent;

    // If scoping is requested, ignore events outside the scope element.
    if (this.scopeElement) {
      const withinScope =
        e.target instanceof Node ? this.scopeElement.contains(e.target) : false;
      if (!withinScope) return;
    }

    // Normalize deltaY to pixels
    let dy = e.deltaY;
    // deltaMode: 0=pixels, 1=lines (~16px), 2=pages (viewport height)
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= window.innerHeight;

    this.wheelPxAccum += dy;

    // Convert accumulated pixels into integer ticks (truncate toward zero)
    const per = this.pixelsPerTick;
    if (Math.abs(this.wheelPxAccum) >= per) {
      const ticks = (this.wheelPxAccum / per) | 0; // signed int with same sign as dy
      // Map: scroll up (dy < 0) => positive ticks (zoom in); scroll down => negative
      this.latchedSignedTicks += -ticks;
      this.wheelPxAccum -= ticks * per; // keep remainder for smoothness
    }

    if (this.preventDefault) {
      e.preventDefault();
    }
  }
}
