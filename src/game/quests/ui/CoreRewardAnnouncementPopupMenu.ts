// src/ui/menus/CoreRewardAnnouncementPopupMenu.ts
// ────────────────────────────────────────────────────────────────────────────
//  CoreRewardAnnouncementPopupMenu
//  • Surfaces when the player is granted one-or-more Power-Cores.
//  • ENTERING  → slides in from the top, overshooting its rest position.
//  • CORRECTING→ eases back to the precise rest position.
//  • DISPLAYING→ remains static for a short interval.
//  • EXITING   → slides back out the way it came.
//  • CLOSED    → inert.
// ────────────────────────────────────────────────────────────────────────────

import { CanvasManager }          from '@/core/CanvasManager';
import { drawMinimalistWindow }   from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel }              from '@/ui/primitives/UILabel';
import { getUniformScaleFactor }  from '@/config/view';
import { DEFAULT_CONFIG }         from '@/config/ui';

import { GlobalEventBus }         from '@/core/EventBus';
import { getCoreCanvas }          from '@/scenes/debriefing/helpers/drawCore';

import { audioManager }           from '@/audio/Audio';

/* ─────────────────────  Temporal constants (seconds)  ─────────────────── */
const ENTER_DURATION   = 0.36;
const CORRECT_DURATION = 0.18;
const DISPLAY_DURATION = 2.0;
const EXIT_DURATION    = 0.36;

/* ─────────────────────  Helpers  ─────────────────── */
const lerp    = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

/* ─────────────────────  FSM  ─────────────────── */
enum PopupPhase { ENTERING, CORRECTING, DISPLAYING, EXITING, CLOSED }

export class CoreRewardAnnouncementPopupMenu {
  /* ——— Dependencies ——— */
  private readonly canvasManager = CanvasManager.getInstance();
  private readonly ctx           = this.canvasManager.getContext('overlay');

  /* ——— State ——— */
  private phase: PopupPhase   = PopupPhase.CLOSED;
  private phaseElapsed        = 0;                    // ms within current phase

  private amount = 0;
  private coreIcon: HTMLCanvasElement | null = null;

  /* ——— Layout (scaled) ——— */
  private windowW = 260;
  private windowH = 260;
  private windowX = 0;
  private windowY = 0;

  /* ——— Event binding ——— */
  private readonly boundOpen = (p: { amount: number }) => this.openMenu(p.amount);

  constructor() {
    GlobalEventBus.on('quests:announcement:cores', this.boundOpen);
  }

  /* ——— Public API ——— */
  openMenu(amount: number): void {
    this.amount    = amount;
    this.coreIcon  = getCoreCanvas();   // synchronous + cached
    this.phase     = PopupPhase.ENTERING;
    this.phaseElapsed = 0;
    this.resize();

    audioManager.play('assets/sounds/sfx/debriefing/debriefing_addcores_00.wav', 'sfx', { maxSimultaneous: 4 });
  }

  isOpen(): boolean { return this.phase !== PopupPhase.CLOSED; }

  destroy(): void {
    GlobalEventBus.off('quests:announcement:cores', this.boundOpen);
  }

  /* ——— Frame lifecycle ——— */
  update(dt: number): void {
    if (this.phase === PopupPhase.CLOSED) return;

    this.phaseElapsed += dt;

    switch (this.phase) {
      case PopupPhase.ENTERING:
        if (this.phaseElapsed >= ENTER_DURATION)   this.transitionTo(PopupPhase.CORRECTING);
        break;
      case PopupPhase.CORRECTING:
        if (this.phaseElapsed >= CORRECT_DURATION) this.transitionTo(PopupPhase.DISPLAYING);
        break;
      case PopupPhase.DISPLAYING:
        if (this.phaseElapsed >= DISPLAY_DURATION) this.transitionTo(PopupPhase.EXITING);
        break;
      case PopupPhase.EXITING:
        if (this.phaseElapsed >= EXIT_DURATION)    this.transitionTo(PopupPhase.CLOSED);
        break;
    }
  }

  render(): void {
    if (this.phase === PopupPhase.CLOSED || !this.coreIcon) return;

    /* ─── Slide interpolation ─── */
    const offscreen = -(this.windowY + this.windowH);
    const overshoot = 20 * getUniformScaleFactor();
    const rest      = 0;

    let dy = 0;
    switch (this.phase) {
      case PopupPhase.ENTERING:
        dy = lerp(offscreen, overshoot, easeOut(clamp01(this.phaseElapsed / ENTER_DURATION)));
        break;
      case PopupPhase.CORRECTING:
        dy = lerp(overshoot, rest, 1 - easeOut(1 - clamp01(this.phaseElapsed / CORRECT_DURATION)));
        break;
      case PopupPhase.EXITING:
        dy = lerp(rest, offscreen, easeOut(clamp01(this.phaseElapsed / EXIT_DURATION)));
        break;
      // DISPLAYING → dy = 0
    }

    const x     = this.windowX;
    const y     = this.windowY + dy;
    const scale = getUniformScaleFactor();
    const ctx   = this.ctx;

    /* ─── Window ─── */
    drawMinimalistWindow(
      ctx, x, y, this.windowW, this.windowH,
      { ...DEFAULT_CONFIG.window.options, alpha: 0.7 },
    );

    /* ─── Header label ─── */
    drawLabel(
      ctx,
      x + this.windowW / 2,
      y - 28 * scale,
      `${this.amount} Cores Awarded!`,
      { font: `${18 * scale}px monospace`, align: 'center', glow: true },
    );

    /* ─── Icon ─── */
    const iconSize = 128 * scale;
    const iconX    = x + (this.windowW - iconSize) / 2;
    const iconY    = y + (this.windowH - iconSize) / 2 + 18 * scale;

    ctx.drawImage(this.coreIcon, iconX, iconY, iconSize, iconSize);
  }

  /* ——— Helpers ——— */
  private transitionTo(next: PopupPhase): void {
    this.phase        = next;
    this.phaseElapsed = 0;

    if (next === PopupPhase.CLOSED) {
      this.coreIcon = null;
      this.amount   = 0;
    }
  }

  private resize(): void {
    const scale = getUniformScaleFactor();
    const vp    = this.canvasManager.getCanvas('overlay');
    this.windowW = 260 * scale;
    this.windowH = 260 * scale;
    this.windowX = 20  * scale;
    this.windowY = (vp.height - this.windowH) / 2;
  }
}
