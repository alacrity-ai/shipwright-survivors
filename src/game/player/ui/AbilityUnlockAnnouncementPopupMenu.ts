// src/ui/menus/AbilityUnlockAnnouncementPopupMenu.ts
//----------------------------------------------------------------------------------------------------------------------
//  AbilityUnlockAnnouncementPopupMenu
//  • Pops up whenever the player unlocks an ability.
//  • ENTERING  → slides in from the top, overshooting its rest position.
//  • CORRECTING→ eases back to the precise rest position.
//  • DISPLAYING→ remains static for a short interval.
//  • EXITING   → slides back out the way it came.
//  • CLOSED    → inert.
//----------------------------------------------------------------------------------------------------------------------

import { CanvasManager }              from '@/core/CanvasManager';
import { drawMinimalistWindow }       from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel }                  from '@/ui/primitives/UILabel';
import { getUniformScaleFactor }      from '@/config/view';
import { DEFAULT_CONFIG }             from '@/config/ui';

import { GlobalEventBus }             from '@/core/EventBus';
import { getAbility }                 from '@/game/player/registry/AbilityRegistry';
import { resolveAbilityIconSprite }   from '@/game/player/cache/AbilityIconCache';

import { audioManager } from '@/audio/Audio';

/* ──────────────────────────────────────────────────────────────────────────
 *  Temporal configuration (seconds)                                             (Δt is supplied in ms)
 * ──────────────────────────────────────────────────────────────────────── */
const ENTER_DURATION      = 0.36;
const CORRECT_DURATION    = 0.18;
const DISPLAY_DURATION    = 2.00;
const EXIT_DURATION       = 0.36;

/* ──────────────────────────────────────────────────────────────────────────
 *  Helpers
 * ──────────────────────────────────────────────────────────────────────── */
const lerp    = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/** Easing: ease-out quadratic for more natural deceleration. */
const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

/* ──────────────────────────────────────────────────────────────────────────
 *  Finite-state enumeration
 * ──────────────────────────────────────────────────────────────────────── */
enum PopupPhase {
  ENTERING,
  CORRECTING,
  DISPLAYING,
  EXITING,
  CLOSED,
}

export class AbilityUnlockAnnouncementPopupMenu {
  /* ──────────────────────────────────────────────────────────────
   *  Dependencies & drawing context
   * ────────────────────────────────────────────────────────── */
  private readonly canvasManager = CanvasManager.getInstance();
  private readonly ctx           = this.canvasManager.getContext('dialogue');

  /* ──────────────────────────────────────────────────────────────
   *  State
   * ────────────────────────────────────────────────────────── */
  private phase: PopupPhase      = PopupPhase.CLOSED;
  private phaseElapsed           = 0;            // ms within current phase

  private abilityId:  string | null            = null;
  private abilityName = '';
  private abilityIcon: HTMLCanvasElement | null = null;

  /* ──────────────────────────────────────────────────────────────
   *  Layout (px * scale) – recomputed on open / resize
   * ────────────────────────────────────────────────────────── */
  private windowW = 260;
  private windowH = 260;
  private windowX = 0;
  private windowY = 0;

  /* ──────────────────────────────────────────────────────────────
   *  Event binding
   * ────────────────────────────────────────────────────────── */
  private readonly boundOpen = (p: { abilityKey: string }) => this.openMenu(p.abilityKey);

  constructor() {
    GlobalEventBus.on('abilities:announcement:open', this.boundOpen);
  }

  /* ──────────────────────────────────────────────────────────────
   *  Public API
   * ────────────────────────────────────────────────────────── */
  openMenu(abilityKey: string): void {
    const { name, iconKey } = getAbility(abilityKey as any);         // compile-time safety
    this.abilityId   = abilityKey;
    this.abilityName = name;
    this.abilityIcon = resolveAbilityIconSprite(iconKey);

    this.phase        = PopupPhase.ENTERING;
    this.phaseElapsed = 0;
    this.resize();

    audioManager.play('assets/sounds/sfx/magic/ability_unlock.wav', 'sfx', { maxSimultaneous: 4 });
  }

  isOpen(): boolean { return this.phase !== PopupPhase.CLOSED; }

  destroy(): void {
    GlobalEventBus.off('abilities:announcement:open', this.boundOpen);
  }

  /* ──────────────────────────────────────────────────────────────
   *  Frame lifecycle
   * ────────────────────────────────────────────────────────── */
  update(dt: number): void {
    if (this.phase === PopupPhase.CLOSED) return;

    this.phaseElapsed += dt;

    switch (this.phase) {
      case PopupPhase.ENTERING:
        if (this.phaseElapsed >= ENTER_DURATION) {
          this.transitionTo(PopupPhase.CORRECTING);
        }
        break;

      case PopupPhase.CORRECTING:
        if (this.phaseElapsed >= CORRECT_DURATION) {
          this.transitionTo(PopupPhase.DISPLAYING);
        }
        break;

      case PopupPhase.DISPLAYING:
        if (this.phaseElapsed >= DISPLAY_DURATION) {
          this.transitionTo(PopupPhase.EXITING);
        }
        break;

      case PopupPhase.EXITING:
        if (this.phaseElapsed >= EXIT_DURATION) {
          this.transitionTo(PopupPhase.CLOSED);
        }
        break;
    }
  }

  render(): void {
    if (this.phase === PopupPhase.CLOSED || !this.abilityIcon) return;

    /* ----- positional interpolation (sliding) ----- */
    const offscreenStart  = -(this.windowY + this.windowH); // above viewport
    const overshootDelta  = 20 * getUniformScaleFactor();   // px beyond rest position (>0 means lower)
    const restY           = 0;

    let dy = 0;
    switch (this.phase) {
      case PopupPhase.ENTERING: {
        const t = clamp01(this.phaseElapsed / (ENTER_DURATION));
        const easedT = easeOutQuad(t);
        dy = lerp(offscreenStart, overshootDelta, easedT);  // descend into overshoot
        break;
      }
      case PopupPhase.CORRECTING: {
        const t = clamp01(this.phaseElapsed / (CORRECT_DURATION));
        const easedT = 1 - easeOutQuad(1 - t);              // ease-in for a subtle settle-back
        dy = lerp(overshootDelta, restY, easedT);           // ascend up to rest
        break;
      }
      case PopupPhase.EXITING: {
        const t = clamp01(this.phaseElapsed / (EXIT_DURATION));
        const easedT = easeOutQuad(t);
        dy = lerp(restY, offscreenStart, easedT);           // slide back up and out
        break;
      }
      // DISPLAYING → dy = 0
    }

    const x      = this.windowX;
    const y      = this.windowY + dy;
    const scale  = getUniformScaleFactor();
    const ctx    = this.ctx;

    /* ----- Window ----- */
    drawMinimalistWindow(
      ctx,
      x, y,
      this.windowW, this.windowH,
      { ...DEFAULT_CONFIG.window.options, alpha: 0.7 },
    );

    /* ----- “Ability Unlocked!” label ----- */
    drawLabel(
      ctx,
      x + this.windowW / 2,
      y - 28 * scale,
      'Ability Unlocked!',
      { font: `${18 * scale}px monospace`, align: 'center', glow: true },
    );

    /* ----- Ability name ----- */
    drawLabel(
      ctx,
      x + this.windowW / 2,
      y + 36 * scale,
      this.abilityName,
      { font: `${16 * scale}px monospace`, align: 'center', glow: false },
    );

    /* ----- Ability icon ----- */
    {
      const iconSize = 128 * scale;
      const iconX    = x + (this.windowW - iconSize) / 2;
      const iconY    = y + (this.windowH - iconSize) / 2 + 18 * scale;

      const ctx = this.ctx;
      ctx.save();                       // ── begin isolation ──
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha             = 1.0;
      ctx.filter                  = 'none';
      ctx.imageSmoothingEnabled   = true;   // high-quality down-scaling
      ctx.shadowBlur              = 0;      // belt-and-braces
      ctx.drawImage(this.abilityIcon!, iconX, iconY, iconSize, iconSize);
      ctx.restore();                      // ── end isolation ──
    }
  }

  /* ──────────────────────────────────────────────────────────────
   *  Helpers
   * ────────────────────────────────────────────────────────── */
  private transitionTo(next: PopupPhase): void {
    this.phase        = next;
    this.phaseElapsed = 0;

    // Garbage-collect heavy refs after we *enter* CLOSED.
    if (next === PopupPhase.CLOSED) {
      this.abilityIcon = null;
      this.abilityId   = null;
      this.abilityName = '';
    }
  }

  private resize(): void {
    const scale = getUniformScaleFactor();
    const vpW   = this.canvasManager.getCanvas('overlay').width;
    const vpH   = this.canvasManager.getCanvas('overlay').height;

    this.windowW = 260 * scale;
    this.windowH = 260 * scale;
    this.windowX = (vpW - this.windowW) / 2;
    this.windowY = (vpH - this.windowH) / 2;
  }
}
