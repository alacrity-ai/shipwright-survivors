// src/ui/menus/ShipUnlockAnnouncementPopupMenu.ts
// ────────────────────────────────────────────────────────────────────────────
//  ShipUnlockAnnouncementPopupMenu
//  • Triggered when the player unlocks a new ship blueprint.
//  • PRELOADING → (ship-icon load) ⟶ ENTERING → CORRECTING → DISPLAYING → EXITING → CLOSED.
//  • Otherwise visually and behaviorally congruent with the other announcement popups.
// ────────────────────────────────────────────────────────────────────────────

import { CanvasManager }          from '@/core/CanvasManager';
import { drawMinimalistWindow }   from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel }              from '@/ui/primitives/UILabel';
import { drawShipCard }           from '@/ui/primitives/ShipCard';
import { getUniformScaleFactor }  from '@/config/view';
import { DEFAULT_CONFIG }         from '@/config/ui';

import { GlobalEventBus }         from '@/core/EventBus';
import { ShipBlueprintRegistry }  from '@/game/ship/ShipBlueprintRegistry';

import { audioManager }           from '@/audio/Audio';

/* ──────────────────────────────────────────────────────────────────────────
 *  Temporal configuration (seconds)  —  (Δt is supplied in ms)
 * ──────────────────────────────────────────────────────────────────────── */
const ENTER_DURATION      = 0.36;
const CORRECT_DURATION    = 0.18;
const DISPLAY_DURATION    = 2.0;
const EXIT_DURATION       = 0.36;

/* ──────────────────────────────────────────────────────────────────────────
 *  Utility lambdas
 * ──────────────────────────────────────────────────────────────────────── */
const lerp      = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01   = (x: number): number => Math.max(0, Math.min(1, x));
const easeOut   = (t: number): number => 1 - (1 - t) * (1 - t);

/* ──────────────────────────────────────────────────────────────────────────
 *  FSM enumeration
 * ──────────────────────────────────────────────────────────────────────── */
enum PopupPhase {
  PRELOADING,
  ENTERING,
  CORRECTING,
  DISPLAYING,
  EXITING,
  CLOSED,
}

export class ShipUnlockAnnouncementPopupMenu {
  /* ———————————————————  Dependencies & drawing context  —————————————————— */
  private readonly canvasManager = CanvasManager.getInstance();
  private readonly ctx           = this.canvasManager.getContext('dialogue');

  /* ———————————————————  Mutable state  —————————————————— */
  private phase: PopupPhase      = PopupPhase.CLOSED;
  private phaseElapsed           = 0;                   // ms within current phase

  private shipId:   string | null                      = null;
  private shipName  = '';
  /** ShipCard is rendered to an off-screen canvas once loaded, then blitted. */
  private shipCard: HTMLCanvasElement | null           = null;

  /* ———————————————————  Layout (scaled, recomputed on open / resize)  ———— */
  private windowW = 260;
  private windowH = 260;
  private windowX = 0;
  private windowY = 0;

  /* ———————————————————  Event binding  —————————————————— */
  private readonly boundOpen = (p: { shipId: string }) => this.openMenu(p.shipId);

  constructor() {
    GlobalEventBus.on('quests:announcement:ship', this.boundOpen);
  }

  /* ———————————————————  Public API  —————————————————— */
  openMenu(shipId: string): void {
    const blueprint = ShipBlueprintRegistry.getByKey(shipId);
    if (!blueprint) {
      console.warn(`[ShipUnlockPopup] Unknown ship id: ${shipId}`);
      return;
    }

    this.shipId    = shipId;
    this.shipName  = blueprint.name;
    this.shipCard  = null;                     // defer until drawShipCard completes
    this.phase     = PopupPhase.PRELOADING;
    this.phaseElapsed = 0;
    this.resize();

    // fire-and-forget async sprite generation
    void this.preloadShipCard();

    audioManager.play('assets/sounds/sfx/ui/gamblewin_02.wav', 'sfx', { maxSimultaneous: 4 });
  }

  isOpen(): boolean { return this.phase !== PopupPhase.CLOSED; }

  destroy(): void {
    GlobalEventBus.off('quests:announcement:ship', this.boundOpen);
  }

  /* ———————————————————  Frame lifecycle  —————————————————— */
  update(dt: number): void {
    if (this.phase === PopupPhase.CLOSED) return;
    if (this.phase === PopupPhase.PRELOADING) return;   // dormant while asset loads

    this.phaseElapsed += dt;

    switch (this.phase) {
      case PopupPhase.ENTERING:
        if (this.phaseElapsed >= ENTER_DURATION) this.transitionTo(PopupPhase.CORRECTING);
        break;
      case PopupPhase.CORRECTING:
        if (this.phaseElapsed >= CORRECT_DURATION) this.transitionTo(PopupPhase.DISPLAYING);
        break;
      case PopupPhase.DISPLAYING:
        if (this.phaseElapsed >= DISPLAY_DURATION) this.transitionTo(PopupPhase.EXITING);
        break;
      case PopupPhase.EXITING:
        if (this.phaseElapsed >= EXIT_DURATION)   this.transitionTo(PopupPhase.CLOSED);
        break;
    }
  }

  render(): void {
    if (
      this.phase === PopupPhase.CLOSED ||
      this.phase === PopupPhase.PRELOADING ||
      !this.shipCard
    ) return;

    /* ───── slide-in / slide-out interpolation ───── */
    const offscreen   = -(this.windowY + this.windowH);
    const overshoot   = 20 * getUniformScaleFactor();
    const rest        = 0;

    let dy = 0;
    switch (this.phase) {
      case PopupPhase.ENTERING:   dy = lerp(offscreen, overshoot, easeOut(clamp01(this.phaseElapsed / ENTER_DURATION)));       break;
      case PopupPhase.CORRECTING: dy = lerp(overshoot, rest,    1 - easeOut(1 - clamp01(this.phaseElapsed / CORRECT_DURATION))); break;
      case PopupPhase.EXITING:    dy = lerp(rest,      offscreen, easeOut(clamp01(this.phaseElapsed / EXIT_DURATION)));        break;
      // DISPLAYING → dy = 0
    }

    const x     = this.windowX;
    const y     = this.windowY + dy;
    const scale = getUniformScaleFactor();
    const ctx   = this.ctx;

    /* ───── Window frame ───── */
    drawMinimalistWindow(
      ctx, x, y,
      this.windowW, this.windowH,
      { ...DEFAULT_CONFIG.window.options, alpha: 0.7 },
    );

    /* ───── “Ship Unlocked!” header ───── */
    drawLabel(
      ctx,
      x + this.windowW / 2,
      y - 28 * scale,
      'Ship Unlocked!',
      { font: `${18 * scale}px monospace`, align: 'center', glow: true },
    );

    /* ───── Ship name ───── */
    drawLabel(
      ctx,
      x + this.windowW / 2,
      y + 36 * scale,
      this.shipName,
      { font: `${16 * scale}px monospace`, align: 'center', glow: false },
    );

    /* ───── Ship icon (pre-rendered canvas) ───── */
    const iconSize = 128 * scale;
    const iconX    = x + (this.windowW - iconSize) / 2;
    const iconY    = y + (this.windowH - iconSize) / 2 + 18 * scale;

    ctx.drawImage(this.shipCard, iconX, iconY, iconSize, iconSize);
  }

  /* ———————————————————  Helpers  —————————————————— */
  private async preloadShipCard(): Promise<void> {
    const blueprint = this.shipId ? ShipBlueprintRegistry.getByKey(this.shipId) : undefined;
    if (!blueprint) return;

    /* Render the ship card to an off-screen canvas once, then reuse. */
    const tmp = document.createElement('canvas');
    tmp.width = tmp.height = 256;                         // generous backing-store
    const tctx = tmp.getContext('2d')!;

    await drawShipCard({
      ctx: tctx,
      x:   0,
      y:   0,
      size: 256,
      shipId: this.shipId!,
      isHovered: false,
      isSelected: true,      // emphasise brightness
      isLocked: false,
      alpha: 1.0,
      scale: 1.0,
    });

    this.shipCard = tmp;

    if (this.phase === PopupPhase.PRELOADING) this.transitionTo(PopupPhase.ENTERING);
  }

  private transitionTo(next: PopupPhase): void {
    this.phase        = next;
    this.phaseElapsed = 0;

    if (next === PopupPhase.CLOSED) {
      this.shipCard  = null;
      this.shipId    = null;
      this.shipName  = '';
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
